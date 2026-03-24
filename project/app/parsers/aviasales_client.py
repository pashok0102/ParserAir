from __future__ import annotations

import json
from concurrent.futures import ThreadPoolExecutor, as_completed, wait
import re
from threading import Lock
from time import monotonic
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

import requests
from requests.adapters import HTTPAdapter

from app.config import Settings
from app.parsers.rendered_price import (
    extract_rendered_attr_price,
    extract_rendered_price,
    extract_rendered_text_content,
    extract_rendered_text_price,
)


@dataclass
class Ticket:
    origin: str
    destination: str
    price: int
    airline: str
    departure_at: str
    transfers: int
    link: str
    source: str = "Aviasales"
    updated_at: str = ""
    estimated_price: bool = False
    baggage_info: str = ""


class AviasalesClient:
    API_PAGE_LIMIT = 100
    ANYWHERE_CANDIDATE_MULTIPLIER = 8
    ANYWHERE_CANDIDATE_LIMIT = 150
    ANYWHERE_MAX_WORKERS = 6
    ANYWHERE_EXACT_CANDIDATES = 18
    ANYWHERE_EXACT_TIMEOUT_SECONDS = 10
    EXACT_RENDERED_PRICE_MAX_WORKERS = 6
    EXACT_RENDERED_PRICE_CANDIDATES = 12
    EXACT_PRICE_CACHE_TTL_SECONDS = 300
    EXACT_PRICE_CACHE_VERSION = "v2-main-price"

    def __init__(self, settings: Settings):
        self.settings = settings
        self._location_cache: dict[str, str] = {}
        self._location_name_cache: dict[str, str] = {}
        self._airport_name_cache: dict[str, str] = {}
        self._exact_price_cache: dict[str, tuple[float, int | None, str]] = {}
        self._exact_price_cache_lock = Lock()
        self.session = self._build_session()

    @staticmethod
    def _build_session() -> requests.Session:
        session = requests.Session()
        adapter = HTTPAdapter(pool_connections=32, pool_maxsize=32)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        session.headers.update({"User-Agent": "Mozilla/5.0", "Accept": "application/json,text/plain,*/*"})
        return session

    def get_hot_tickets(
        self,
        route: str,
        limit: int = 10,
        request_limit: int = 100,
        departure_date: date | None = None,
        strict_exact_price: bool = True,
    ) -> list[Ticket]:
        origin, destination = self._parse_route(route)
        raw_tickets = self._fetch_tickets(origin=origin, destination=destination, limit=request_limit)

        now = datetime.now(timezone.utc)
        upcoming: list[dict] = []
        for ticket in raw_tickets:
            departure_dt = self._parse_iso(ticket.get("departure_at"))
            if departure_dt < now:
                continue
            if departure_date and departure_dt.date() != departure_date:
                continue
            ticket["estimated_price"] = True
            upcoming.append(ticket)

        upcoming.sort(key=lambda t: (int(t.get("price", 10**9)), self._parse_iso(t.get("departure_at"))))
        selected = upcoming[:limit]
        if strict_exact_price:
            selected = selected[: self.EXACT_RENDERED_PRICE_CANDIDATES]

        max_workers = min(self.EXACT_RENDERED_PRICE_MAX_WORKERS, max(1, len(selected)))
        try:
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = [executor.submit(self._refine_exact_ticket_price, item) for item in selected]
                for future in as_completed(futures):
                    future.result()
        except RuntimeError:
            for item in selected:
                self._refine_exact_ticket_price(item)

        if strict_exact_price:
            selected = [item for item in selected if not item.get("estimated_price", True)]
        selected.sort(key=lambda t: (int(t.get("price", 10**9)), self._parse_iso(t.get("departure_at"))))
        return [self._to_ticket(item) for item in selected]

    def get_hot_tickets_in_range(
        self,
        route: str,
        start_date: date,
        end_date: date,
        limit: int | None = None,
        request_limit: int = 200,
    ) -> list[Ticket]:
        origin, destination = self._parse_route(route)
        raw_tickets = self._fetch_tickets(origin=origin, destination=destination, limit=request_limit)

        now = datetime.now(timezone.utc)
        selected: list[dict] = []
        for ticket in raw_tickets:
            departure_dt = self._parse_iso(ticket.get("departure_at"))
            if departure_dt < now:
                continue
            dep_date = departure_dt.date()
            if dep_date < start_date or dep_date > end_date:
                continue
            ticket["estimated_price"] = True
            selected.append(ticket)

        selected.sort(key=lambda t: (self._parse_iso(t.get("departure_at")), int(t.get("price", 10**9))))
        if limit is not None:
            selected = selected[:limit]
        return [self._to_ticket(item) for item in selected]

    def get_hot_tickets_anywhere(
        self,
        origin_value: str,
        limit: int = 10,
        request_limit: int = 100,
        departure_date: date | None = None,
        refine_exact: bool = True,
    ) -> list[Ticket]:
        origin = self._resolve_location_code(origin_value)
        candidate_limit = min(
            max(limit * self.ANYWHERE_CANDIDATE_MULTIPLIER, request_limit, limit),
            self.ANYWHERE_CANDIDATE_LIMIT,
        )
        raw_tickets = self._fetch_anywhere_tickets(origin=origin, limit=candidate_limit, departure_date=departure_date)

        now = datetime.now(timezone.utc)
        candidates: list[dict] = []
        seen_destinations: set[str] = set()
        for ticket in raw_tickets:
            departure_dt = self._parse_iso(ticket.get("departure_at"))
            if departure_dt < now:
                continue
            destination = str(ticket.get("destination", "")).upper()
            if not destination or destination == origin or destination in seen_destinations:
                continue
            seen_destinations.add(destination)
            candidates.append(ticket)

        candidates.sort(key=lambda t: (int(t.get("price", 10**9)), self._parse_iso(t.get("departure_at"))))

        if not refine_exact:
            return [self._to_ticket(item) for item in candidates[:limit]]

        exact_results: list[Ticket] = []
        exact_candidates = candidates[: min(len(candidates), max(limit * 2, self.ANYWHERE_EXACT_CANDIDATES))]

        def fetch_exact_ticket(candidate: dict) -> Ticket | None:
            destination = str(candidate.get("destination", "")).upper()
            if not destination:
                return None
            route = f"{origin} - {destination}"
            try:
                exact_ticket = self.get_hot_tickets(
                    route=route,
                    limit=1,
                    request_limit=max(100, request_limit, limit * 4),
                    departure_date=departure_date,
                )
            except requests.RequestException:
                return None
            if not exact_ticket:
                return None
            return exact_ticket[0]

        max_workers = min(self.ANYWHERE_MAX_WORKERS, max(1, len(exact_candidates)))
        try:
            executor = ThreadPoolExecutor(max_workers=max_workers)
            futures = [executor.submit(fetch_exact_ticket, candidate) for candidate in exact_candidates]
            try:
                done, not_done = wait(futures, timeout=self.ANYWHERE_EXACT_TIMEOUT_SECONDS)
                for future in done:
                    exact_ticket = future.result()
                    if exact_ticket is not None:
                        exact_results.append(exact_ticket)
                for future in not_done:
                    future.cancel()
            finally:
                executor.shutdown(wait=False, cancel_futures=True)
        except RuntimeError:
            for candidate in exact_candidates:
                exact_ticket = fetch_exact_ticket(candidate)
                if exact_ticket is not None:
                    exact_results.append(exact_ticket)

        if exact_results:
            exact_results.sort(key=lambda t: (t.price, self._parse_iso(t.departure_at)))
            if len(exact_results) >= limit:
                return exact_results[:limit]

            seen_destinations = {ticket.destination for ticket in exact_results}
            fallback_tickets = [self._to_ticket(item) for item in candidates if str(item.get("destination", "")).upper() not in seen_destinations]
            return (exact_results + fallback_tickets)[:limit]

        return [self._to_ticket(item) for item in candidates[:limit]]

    def get_available_departure_dates(self, route: str, request_limit: int = 100) -> list[date]:
        origin, destination = self._parse_route(route)
        raw_tickets = self._fetch_tickets(origin=origin, destination=destination, limit=request_limit)

        now = datetime.now(timezone.utc)
        dates: set[date] = set()
        for ticket in raw_tickets:
            departure_dt = self._parse_iso(ticket.get("departure_at"))
            if departure_dt >= now:
                dates.add(departure_dt.date())
        return sorted(dates)

    def parse_route_to_iata(self, route: str) -> tuple[str, str]:
        return self._parse_route(route)

    def resolve_location_name(self, raw_value: str) -> str:
        normalized = self._repair_mojibake(raw_value)
        if not normalized:
            return ""

        cache_key = normalized.upper()
        if cache_key in self._location_name_cache:
            return self._location_name_cache[cache_key]

        url = "https://autocomplete.travelpayouts.com/places2"
        variants = [
            {"term": normalized, "locale": "ru", "types[]": "city"},
            {"term": normalized, "locale": "ru", "types[]": "airport"},
            {"term": normalized, "locale": "en", "types[]": "city"},
            {"term": normalized, "locale": "en", "types[]": "airport"},
        ]

        for params in variants:
            try:
                response = self.session.get(url, params=params, timeout=20)
                response.raise_for_status()
                payload = response.json()
            except requests.RequestException:
                continue

            if not isinstance(payload, list):
                continue

            matched = self._find_matching_place(payload, normalized)
            if not matched:
                continue

            label = self._build_location_label(matched)
            if label:
                self._location_name_cache[cache_key] = label
                return label

        return normalized

    def resolve_airport_name(self, raw_value: str) -> str:
        normalized = self._repair_mojibake(raw_value)
        if not normalized:
            return ""

        cache_key = normalized.upper()
        if cache_key in self._airport_name_cache:
            return self._airport_name_cache[cache_key]

        url = "https://autocomplete.travelpayouts.com/places2"
        variants = [
            {"term": normalized, "locale": "ru", "types[]": "airport"},
            {"term": normalized, "locale": "en", "types[]": "airport"},
            {"term": normalized, "locale": "ru", "types[]": "city"},
            {"term": normalized, "locale": "en", "types[]": "city"},
        ]

        for params in variants:
            try:
                response = self.session.get(url, params=params, timeout=20)
                response.raise_for_status()
                payload = response.json()
            except requests.RequestException:
                continue

            if not isinstance(payload, list):
                continue

            matched = self._find_matching_place(payload, normalized)
            if not matched:
                continue

            label = self._build_airport_label(matched)
            if label:
                self._airport_name_cache[cache_key] = label
                return label

        fallback = self.resolve_location_name(normalized)
        self._airport_name_cache[cache_key] = fallback
        return fallback

    @staticmethod
    def _repair_mojibake(value: str) -> str:
        normalized = (value or "").strip()
        if not normalized:
            return normalized

        if not any(marker in normalized for marker in ("Р", "С", "Ð", "Ñ")):
            return normalized

        for encoding in ("cp1251", "latin1"):
            try:
                repaired = normalized.encode(encoding).decode("utf-8")
            except (UnicodeEncodeError, UnicodeDecodeError):
                continue
            if repaired and repaired != normalized:
                return repaired.strip()

        return normalized

    @staticmethod
    def split_route_parts(route: str) -> tuple[str, str]:
        raw = route.strip()
        if not raw:
            raise ValueError("Маршрут не указан")

        for sep in (" - ", " – ", " — "):
            if sep in raw:
                left, right = raw.split(sep, maxsplit=1)
                left = left.strip()
                right = right.strip()
                if left and right:
                    return left, right

        m = re.fullmatch(r"([A-Za-z]{3})[-–—]([A-Za-z]{3})", raw)
        if m:
            return m.group(1), m.group(2)

        raise ValueError("Маршрут должен быть в формате: Город - Город или IATA-IATA")

    def _parse_route(self, route: str) -> tuple[str, str]:
        city_from, city_to = self.split_route_parts(route)
        return self._resolve_location_code(city_from), self._resolve_location_code(city_to)

    def _fetch_tickets(self, origin: str, destination: str, limit: int) -> list[dict]:
        url = f"{self.settings.base_url}/aviasales/v3/prices_for_dates"
        headers = {"X-Access-Token": self.settings.api_key, "Accept": "application/json"}

        remaining = max(limit, 1)
        page = 1
        all_data: list[dict] = []

        while remaining > 0:
            batch_limit = min(self.API_PAGE_LIMIT, remaining)
            params = {
                "origin": origin,
                "destination": destination,
                "currency": self.settings.currency,
                "one_way": "true",
                "sorting": "price",
                "trip_class": 0,
                "limit": batch_limit,
                "page": page,
            }

            response = self.session.get(url, params=params, headers=headers, timeout=40)
            response.raise_for_status()
            payload = response.json()

            data = payload.get("data", [])
            if isinstance(data, dict):
                data = list(data.values())
            if not isinstance(data, list) or not data:
                break

            all_data.extend(data)
            remaining -= len(data)
            if len(data) < batch_limit:
                break

            page += 1
            if page > 20:
                break

        return all_data

    def _fetch_anywhere_tickets(self, origin: str, limit: int, departure_date: date | None = None) -> list[dict]:
        url = f"{self.settings.base_url}/v1/prices/cheap"
        params = {
            "origin": origin,
            "currency": self.settings.currency,
            "page": 1,
            "token": self.settings.api_key,
            "one_way": "true",
        }
        if departure_date:
            params["depart_date"] = departure_date.isoformat()

        response = self.session.get(url, params=params, timeout=40, headers={"Accept": "application/json"})
        response.raise_for_status()
        payload = response.json()
        data = payload.get("data", {})

        items = self._collect_anywhere_items(data)

        normalized: list[dict] = []
        for item in items[: max(limit, 1)]:
            if not isinstance(item, dict):
                continue
            normalized.append(self._normalize_anywhere_ticket(item, origin))

        return normalized

    def _collect_anywhere_items(self, node: object, inherited_destination: str | None = None) -> list[dict]:
        items: list[dict] = []

        if isinstance(node, list):
            for item in node:
                items.extend(self._collect_anywhere_items(item, inherited_destination))
            return items

        if not isinstance(node, dict):
            return items

        if any(key in node for key in ("price", "value", "depart_date", "departure_at")):
            normalized = dict(node)
            if inherited_destination and len(inherited_destination) == 3:
                normalized.setdefault("destination", inherited_destination.upper())
            items.append(normalized)
            return items

        for key, value in node.items():
            next_destination = inherited_destination
            if isinstance(key, str) and len(key) == 3 and key.isalpha():
                next_destination = key.upper()
            items.extend(self._collect_anywhere_items(value, next_destination))

        return items

    @staticmethod
    def _normalize_anywhere_ticket(item: dict, origin: str) -> dict:
        normalized = dict(item)
        normalized["origin"] = normalized.get("origin") or origin
        normalized["destination"] = normalized.get("destination") or normalized.get("destination_iata") or normalized.get("dest")
        normalized["price"] = normalized.get("price") or normalized.get("value") or 0
        normalized["airline"] = normalized.get("airline") or normalized.get("airline_code") or "N/A"
        normalized["transfers"] = normalized.get("transfers", normalized.get("number_of_changes", 0))
        normalized["estimated_price"] = True

        if not normalized.get("departure_at"):
            depart_date = normalized.get("departure_at") or normalized.get("depart_date")
            if depart_date:
                normalized["departure_at"] = f"{depart_date}T00:00:00+00:00"

        if not normalized.get("link"):
            link = normalized.get("link") or normalized.get("url")
            if link:
                normalized["link"] = link
            elif normalized.get("destination"):
                normalized["link"] = AviasalesClient._build_aviasales_one_way_link(
                    origin=str(normalized["origin"]).upper(),
                    destination=str(normalized["destination"]).upper(),
                    departure_at=str(normalized.get("departure_at", "")),
                )

        return normalized

    def _refine_exact_ticket_price(self, item: dict) -> bool:
        link = str(item.get("link") or "").strip()
        if not link:
            origin = str(item.get("origin") or "").upper()
            destination = str(item.get("destination") or "").upper()
            departure_at = str(item.get("departure_at") or "")
            link = self._build_aviasales_one_way_link(origin, destination, departure_at)

        if not link:
            item["estimated_price"] = True
            return False

        if not link.startswith("http"):
            link = f"https://www.aviasales.ru{link}"

        cache_key = f"{self.EXACT_PRICE_CACHE_VERSION}|{link}"
        cache_hit, cached_price, cached_baggage = self._get_cached_exact_price(cache_key)
        if cache_hit:
            if cached_price is None:
                item["estimated_price"] = True
                return False
            item["price"] = cached_price
            item["estimated_price"] = False
            if cached_baggage:
                item["baggage_info"] = cached_baggage
            return True

        rendered_price = extract_rendered_text_price(
            link,
            selector='[data-test-id="price"]',
            price_min=3000,
            price_max=500000,
            timeout_ms=7000,
        )

        if rendered_price is None:
            rendered_price = extract_rendered_price(
                link,
                patterns=[
                    r'data-test-id="price">(\d{1,3}(?:[ \u00A0\u202F]\d{3})+|\d{4,6})\s*₽',
                    r'data-test-id="proposal-0"[^>]*data-test-price="(\d{3,6})"',
                ],
                price_min=3000,
                price_max=500000,
                timeout_ms=7000,
                pick="first",
            )

        if rendered_price is None:
            rendered_price = extract_rendered_attr_price(
                link,
                selector='[data-test-id="proposal-0"]',
                attribute='data-test-price',
                price_min=3000,
                price_max=500000,
                timeout_ms=7000,
            )

        if rendered_price is not None:
            item["price"] = rendered_price
            item["estimated_price"] = False
            baggage_info = self._extract_baggage_info(link)
            if baggage_info:
                item["baggage_info"] = baggage_info
            self._set_cached_exact_price(cache_key, rendered_price, baggage_info)
            return True

        self._set_cached_exact_price(cache_key, None, "")
        item["estimated_price"] = True
        return False

    def _extract_baggage_info(self, link: str) -> str:
        proposal_text = extract_rendered_text_content(
            link,
            selector='[data-test-id="proposal-0"]',
            timeout_ms=7000,
        )
        if not proposal_text:
            return ""

        lines = [line.strip() for line in proposal_text.splitlines() if line.strip()]
        baggage_lines: list[str] = []
        for line in lines:
            normalized = line.lower()
            if normalized.startswith("багаж") or normalized.startswith("ручная кладь"):
                baggage_lines.append(line)

        if baggage_lines:
            return " | ".join(dict.fromkeys(baggage_lines))

        compact_matches = re.findall(
            r"(Багаж\s+[^\n|]+|Ручная\s+кладь\s+[^\n|]+)",
            proposal_text,
            flags=re.IGNORECASE,
        )
        if compact_matches:
            cleaned = [match.strip() for match in compact_matches if match.strip()]
            return " | ".join(dict.fromkeys(cleaned))

        return ""

    def _get_cached_exact_price(self, cache_key: str) -> tuple[bool, int | None, str]:
        now = monotonic()
        with self._exact_price_cache_lock:
            cached = self._exact_price_cache.get(cache_key)
            if not cached:
                return False, None, ""
            expires_at, price, baggage_info = cached
            if expires_at <= now:
                self._exact_price_cache.pop(cache_key, None)
                return False, None, ""
            return True, price, baggage_info

    def _set_cached_exact_price(self, cache_key: str, price: int | None, baggage_info: str = "") -> None:
        with self._exact_price_cache_lock:
            self._exact_price_cache[cache_key] = (monotonic() + self.EXACT_PRICE_CACHE_TTL_SECONDS, price, baggage_info)

    @staticmethod
    def _build_aviasales_one_way_link(origin: str, destination: str, departure_at: str) -> str:
        dep = AviasalesClient._extract_date(departure_at)
        if not dep:
            return ""
        # Aviasales deep-link format for one-way search: ORIGIN + DDMM + DESTINATION + passengers
        return f"/search/{origin}{dep.strftime('%d%m')}{destination}1"

    def _resolve_location_code(self, raw_value: str) -> str:
        normalized = self._repair_mojibake(raw_value)
        candidate = normalized.upper()
        if len(candidate) == 3 and candidate.isalpha():
            return candidate

        cache_key = normalized.lower()
        if cache_key in self._location_cache:
            return self._location_cache[cache_key]

        code = self._resolve_city_iata(normalized)
        if code:
            self._location_cache[cache_key] = code
            return code

        raise ValueError(f"Не удалось определить IATA код для '{raw_value}'")

    def _resolve_city_iata(self, location_name: str) -> str | None:
        url = "https://autocomplete.travelpayouts.com/places2"
        variants = [
            {"term": location_name, "locale": "ru", "types[]": "city"},
            {"term": location_name, "locale": "ru", "types[]": "airport"},
            {"term": location_name, "locale": "en", "types[]": "city"},
            {"term": location_name, "locale": "en", "types[]": "airport"},
        ]

        for params in variants:
            response = self.session.get(url, params=params, timeout=40)
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, list):
                continue
            for item in payload:
                if not isinstance(item, dict):
                    continue
                code = str(item.get("code", "")).upper()
                if len(code) == 3 and code.isalpha():
                    return code
        return None

    @staticmethod
    def _find_matching_place(payload: list[dict], raw_value: str) -> dict | None:
        upper_value = raw_value.upper()
        for item in payload:
            if not isinstance(item, dict):
                continue
            code = str(item.get("code", "")).upper()
            if code == upper_value:
                return item
        return payload[0] if payload else None

    @staticmethod
    def _build_location_label(item: dict) -> str:
        name = str(item.get("name", "")).strip()
        city_name = str(item.get("city_name", "")).strip()

        if city_name and name and name.lower() != city_name.lower():
            return f"{city_name}, {name}"
        if name:
            return name
        if city_name:
            return city_name
        return str(item.get("code", "")).strip()

    @staticmethod
    def _build_airport_label(item: dict) -> str:
        name = str(item.get("name", "")).strip()
        city_name = str(item.get("city_name", "")).strip()

        if name:
            return name
        if city_name:
            return city_name
        return str(item.get("code", "")).strip()

    @staticmethod
    def _parse_iso(value: str | None) -> datetime:
        if not value:
            return datetime.max.replace(tzinfo=timezone.utc)
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
        except ValueError:
            return datetime.max.replace(tzinfo=timezone.utc)

    @staticmethod
    def _extract_date(value: str) -> date | None:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
        except ValueError:
            return None

    @staticmethod
    def _to_ticket(item: dict) -> Ticket:
        return Ticket(
            origin=item.get("origin", ""),
            destination=item.get("destination", ""),
            price=int(item.get("price", 0)),
            airline=item.get("airline", "N/A"),
            departure_at=item.get("departure_at", "N/A"),
            transfers=int(item.get("transfers", 0)),
            link=item.get("link", ""),
            source="Aviasales",
            updated_at=datetime.now(timezone.utc).isoformat(),
            estimated_price=bool(item.get("estimated_price", False)),
            baggage_info=str(item.get("baggage_info", "") or ""),
        )


class TutuClient:
    IATA_TO_TUTU_ID = {"MOW": 491, "AER": 78, "REN": 64}
    IATA_TO_TUTU_SLUG = {"MOW": "Moskva", "AER": "Sochi", "REN": "Orenburg"}

    PRICE_MIN = 3000
    PRICE_MAX = 500000

    def __init__(self, aviasales_client: AviasalesClient):
        self.aviasales_client = aviasales_client
        self.session = aviasales_client._build_session()

    def get_hot_tickets(
        self,
        route: str,
        limit: int = 10,
        request_limit: int = 100,
        departure_date: date | None = None,
        return_date: date | None = None,
    ) -> list[Ticket]:
        del return_date
        city_from, city_to = self.aviasales_client.split_route_parts(route)
        iata_from, iata_to = self.aviasales_client.parse_route_to_iata(route)
        fallback_ticket = self._get_reference_ticket(
            route=route,
            request_limit=request_limit,
            departure_date=departure_date,
        )
        fallback_airline = fallback_ticket.airline if fallback_ticket else ""

        route_min_price = self._fetch_tutu_route_min_price(city_from, city_to, iata_from, iata_to, departure_date)
        used_fallback = False
        if route_min_price is None:
            if not fallback_ticket:
                return []
            route_min_price = fallback_ticket.price
            used_fallback = True

        dep = departure_date or datetime.now(timezone.utc).date()
        departure_at = fallback_ticket.departure_at if fallback_ticket else datetime.combine(dep, datetime.min.time(), tzinfo=timezone.utc).isoformat()
        link = self._build_tutu_hot_link(city_from, city_to, iata_from, iata_to, departure_at)

        return [
            Ticket(
                origin=iata_from,
                destination=iata_to,
                price=route_min_price,
                airline=fallback_airline or ("Нет данных Tutu (fallback Aviasales)" if used_fallback else "Найдено на Tutu"),
                departure_at=departure_at,
                transfers=fallback_ticket.transfers if fallback_ticket else 0,
                link=link,
                source="Tutu.ru",
                updated_at=datetime.now(timezone.utc).isoformat(),
            )
        ]

    def _get_reference_ticket(
        self,
        route: str,
        request_limit: int,
        departure_date: date | None,
    ) -> Ticket | None:
        requests_limit = max(request_limit, 100)

        if departure_date:
            exact = self.aviasales_client.get_hot_tickets(
                route=route,
                limit=1,
                request_limit=requests_limit,
                departure_date=departure_date,
                strict_exact_price=False,
            )
            if exact:
                return exact[0]

            nearby = self.aviasales_client.get_hot_tickets_in_range(
                route=route,
                start_date=departure_date,
                end_date=departure_date + timedelta(days=3),
                limit=1,
                request_limit=requests_limit,
            )
            if nearby:
                return nearby[0]

        generic = self.aviasales_client.get_hot_tickets(
            route=route,
            limit=1,
            request_limit=requests_limit,
            departure_date=None,
            strict_exact_price=False,
        )
        return generic[0] if generic else None

    def get_available_departure_dates(self, route: str, request_limit: int = 100) -> list[date]:
        return self.aviasales_client.get_available_departure_dates(route=route, request_limit=request_limit)

    def build_fallback_ticket(self, reference_ticket: Ticket) -> Ticket:
        city_from = self.aviasales_client.resolve_location_name(reference_ticket.origin)
        city_to = self.aviasales_client.resolve_location_name(reference_ticket.destination)
        link = self._build_tutu_hot_link(
            city_from,
            city_to,
            reference_ticket.origin,
            reference_ticket.destination,
            reference_ticket.departure_at,
        )
        return Ticket(
            origin=reference_ticket.origin,
            destination=reference_ticket.destination,
            price=reference_ticket.price,
            airline=reference_ticket.airline,
            departure_at=reference_ticket.departure_at,
            transfers=reference_ticket.transfers,
            link=link,
            source="Tutu.ru",
            updated_at=datetime.now(timezone.utc).isoformat(),
        )

    def _fetch_tutu_route_min_price(
        self,
        city_from: str,
        city_to: str,
        iata_from: str,
        iata_to: str,
        departure_date: date | None,
    ) -> int | None:
        from_slug = self.IATA_TO_TUTU_SLUG.get(iata_from.upper(), city_from)
        to_slug = self.IATA_TO_TUTU_SLUG.get(iata_to.upper(), city_to)
        route_base = f"https://avia.tutu.ru/f/{from_slug}/{to_slug}/"

        from_id = self.IATA_TO_TUTU_ID.get(iata_from.upper())
        to_id = self.IATA_TO_TUTU_ID.get(iata_to.upper())
        if from_id and to_id and departure_date:
            api_price = self._fetch_tutu_offers_api_min_price(from_id, to_id, departure_date)
            if api_price is not None:
                return api_price

        params = {"class": "Y", "passengers": 100, "travelers": 1}
        if from_id and to_id and departure_date:
            params["route[0]"] = f"{from_id}-{departure_date.strftime('%d%m%Y')}-{to_id}"

        route_url = requests.Request("GET", route_base, params=params).prepare().url
        rendered_price = extract_rendered_price(
            route_url,
            patterns=[
                r"Прямой\s+от\s*(\d{1,3}(?:[ \u00A0]\d{3})+|\d{4,6})\s*₽",
                r"Самый\s+деш[её]вый.{0,500}?(\d{1,3}(?:[ \u00A0]\d{3})+|\d{4,6})\s*₽.{0,120}?за\s+одного",
                r"от\s*(\d{1,3}(?:[ \u00A0]\d{3})+|\d{4,6})\s*₽",
            ],
            price_min=self.PRICE_MIN,
            price_max=self.PRICE_MAX,
        )
        if rendered_price is not None:
            return rendered_price

        try:
            response = self.session.get(route_base, params=params, timeout=40)
            response.raise_for_status()
        except requests.RequestException:
            return None

        return self._extract_price_from_text(response.text)

    def _fetch_tutu_offers_api_min_price(self, from_id: int, to_id: int, departure_date: date) -> int | None:
        base_payload = {
            "passengers": {"child": 0, "infant": 0, "full": 1},
            "serviceClass": "Y",
            "routes": [{"departureCityId": int(from_id), "arrivalCityId": int(to_id), "departureDate": departure_date.isoformat()}],
            "searchId": str(uuid.uuid4()),
            "sessionId": str(uuid.uuid4()),
            "pageId": "airparser",
            "userData": {"referenceToken": "", "screenSize": 1366},
            "source": "offers",
        }

        attempts = [
            ("https://offers-api.tutu.ru/avia/offers", base_payload),
            (
                "https://offers-api.tutu.ru/avia/offers/v2",
                {**base_payload, "dynamicFilters": {}, "offset": 0, "limit": 30, "isNewSearch": True},
            ),
        ]

        for url, payload in attempts:
            try:
                response = self.session.post(
                    url,
                    json=payload,
                    timeout=45,
                    headers={"Content-Type": "application/json"},
                )
                response.raise_for_status()
            except requests.RequestException:
                continue

            parsed = None
            try:
                parsed = response.json()
            except Exception:
                parsed = None

            if parsed is not None:
                candidates = self._extract_price_candidates(parsed)
                if candidates:
                    return candidates[0]

            text = response.text or ""
            for raw in re.findall(r'"amount"\s*:\s*(\d{4,6})', text, flags=re.IGNORECASE):
                numeric = int(raw)
                if self.PRICE_MIN <= numeric <= self.PRICE_MAX:
                    return numeric

        return None

    def _extract_price_candidates(self, node: object) -> list[int]:
        results: list[int] = []

        def walk(value: object, key_path: str = "") -> None:
            if isinstance(value, dict):
                for k, v in value.items():
                    walk(v, f"{key_path}.{k}".lower())
                return
            if isinstance(value, list):
                for item in value:
                    walk(item, key_path)
                return
            if not isinstance(value, (int, float)):
                return

            strict_markers = ("price", "amount", "minprice", "cheapest", "total")
            if not any(marker in key_path for marker in strict_markers):
                return

            numeric = int(value)
            if self.PRICE_MIN <= numeric <= self.PRICE_MAX:
                results.append(numeric)

        walk(node)
        return results

    def _extract_price_from_text(self, text: str) -> int | None:
        patterns = [
            r"Прямой\s+от\s*(\d{1,3}(?:[ \u00A0]\d{3})+|\d{4,6})\s*₽",
            r"от\s*(\d{1,3}(?:[ \u00A0]\d{3})+|\d{4,6})\s*₽",
            r"(\d{1,3}(?:[ \u00A0]\d{3})+|\d{4,6})\s*₽\s*за\s+одного",
            r"(\d{1,3}(?:[ \u00A0]\d{3})+|\d{4,6})\s*₽",
        ]
        for pattern in patterns:
            for raw in re.findall(pattern, text, flags=re.IGNORECASE | re.DOTALL):
                numeric = int(re.sub(r"\D", "", raw))
                if self.PRICE_MIN <= numeric <= self.PRICE_MAX:
                    return numeric
        return None

    def _build_tutu_hot_link(self, city_from: str, city_to: str, iata_from: str, iata_to: str, departure_at: str) -> str:
        from_slug = self.IATA_TO_TUTU_SLUG.get(iata_from.upper(), city_from)
        to_slug = self.IATA_TO_TUTU_SLUG.get(iata_to.upper(), city_to)
        route_base = f"https://avia.tutu.ru/f/{from_slug}/{to_slug}/"

        dep = self._extract_date(departure_at)
        from_id = self.IATA_TO_TUTU_ID.get(iata_from.upper())
        to_id = self.IATA_TO_TUTU_ID.get(iata_to.upper())
        if dep and from_id and to_id:
            return f"{route_base}?class=Y&passengers=100&route[0]={from_id}-{dep.strftime('%d%m%Y')}-{to_id}&travelers=1"
        return route_base

    @staticmethod
    def _extract_date(value: str) -> date | None:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
        except ValueError:
            return None


class KupibiletClient:
    FILTER_PARAM = "%7B%22transportKind%22:%7B%22Airplane%22:true%7D%7D"
    PRICE_MIN = 3000
    PRICE_MAX = 500000

    def __init__(self, aviasales_client: AviasalesClient):
        self.aviasales_client = aviasales_client
        self.session = aviasales_client._build_session()

    def get_hot_tickets(
        self,
        route: str,
        limit: int = 10,
        request_limit: int = 100,
        departure_date: date | None = None,
        return_date: date | None = None,
    ) -> list[Ticket]:
        iata_from, iata_to = self.aviasales_client.parse_route_to_iata(route)
        fallback_ticket = self._get_reference_ticket(
            route=route,
            request_limit=request_limit,
            departure_date=departure_date,
            return_date=return_date,
        )
        fallback_airline = fallback_ticket.airline if fallback_ticket else ""
        dep_date = departure_date or datetime.now(timezone.utc).date()
        route_link = self._build_kupibilet_search_link(iata_from.upper(), iata_to.upper(), dep_date, return_date)

        route_min_price = self._fetch_kupibilet_route_min_price(route_link, dep_date, return_date)
        used_fallback = False
        if route_min_price is None:
            if not fallback_ticket:
                return []
            route_min_price = fallback_ticket.price
            used_fallback = True

        departure_at = fallback_ticket.departure_at if fallback_ticket else datetime.combine(dep_date, datetime.min.time(), tzinfo=timezone.utc).isoformat()
        return [
            Ticket(
                origin=iata_from,
                destination=iata_to,
                price=route_min_price,
                airline=fallback_airline or ("Нет данных Kupibilet (fallback Aviasales)" if used_fallback else "Найдено на Kupibilet"),
                departure_at=departure_at,
                transfers=fallback_ticket.transfers if fallback_ticket else 0,
                link=route_link,
                source="Kupibilet",
                updated_at=datetime.now(timezone.utc).isoformat(),
            )
        ]

    def _get_reference_ticket(
        self,
        route: str,
        request_limit: int,
        departure_date: date | None,
        return_date: date | None,
    ) -> Ticket | None:
        requests_limit = max(request_limit, 100)

        if departure_date and return_date and return_date >= departure_date:
            ranged = self.aviasales_client.get_hot_tickets_in_range(
                route=route,
                start_date=departure_date,
                end_date=return_date,
                limit=1,
                request_limit=requests_limit,
            )
            if ranged:
                return ranged[0]

        if departure_date:
            exact = self.aviasales_client.get_hot_tickets(
                route=route,
                limit=1,
                request_limit=requests_limit,
                departure_date=departure_date,
                strict_exact_price=False,
            )
            if exact:
                return exact[0]

            nearby = self.aviasales_client.get_hot_tickets_in_range(
                route=route,
                start_date=departure_date,
                end_date=departure_date + timedelta(days=3),
                limit=1,
                request_limit=requests_limit,
            )
            if nearby:
                return nearby[0]

        generic = self.aviasales_client.get_hot_tickets(
            route=route,
            limit=1,
            request_limit=requests_limit,
            departure_date=None,
            strict_exact_price=False,
        )
        return generic[0] if generic else None

    def get_available_departure_dates(self, route: str, request_limit: int = 100) -> list[date]:
        return self.aviasales_client.get_available_departure_dates(route=route, request_limit=request_limit)

    def build_fallback_ticket(self, reference_ticket: Ticket) -> Ticket:
        dep_date = self._extract_departure_date(reference_ticket.departure_at) or datetime.now(timezone.utc).date()
        link = self._build_kupibilet_search_link(
            reference_ticket.origin.upper(),
            reference_ticket.destination.upper(),
            dep_date,
            None,
        )
        return Ticket(
            origin=reference_ticket.origin,
            destination=reference_ticket.destination,
            price=reference_ticket.price,
            airline=reference_ticket.airline,
            departure_at=reference_ticket.departure_at,
            transfers=reference_ticket.transfers,
            link=link,
            source="Kupibilet",
            updated_at=datetime.now(timezone.utc).isoformat(),
        )

    @staticmethod
    def _extract_departure_date(value: str) -> date | None:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
        except ValueError:
            return None

    def _fetch_kupibilet_route_min_price(self, url: str, departure_date: date | None, return_date: date | None) -> int | None:
        try:
            response = self.session.get(url, timeout=40, headers={"Accept-Language": "ru-RU,ru;q=0.9"})
            response.raise_for_status()
        except requests.RequestException:
            return None

        calendar_price = self._extract_kupibilet_calendar_price(response.text, departure_date, return_date)
        if calendar_price is not None:
            return calendar_price

        rendered_price = extract_rendered_price(
            url,
            patterns=[
                r"Самый\s+деш[её]вый.{0,900}?(\d{1,3}(?:[ \u00A0]\d{3})+|\d{4,6})\s*₽\s*за\s+всех\s+пассажиров",
                r"(\d{1,3}(?:[ \u00A0]\d{3})+|\d{4,6})\s*₽\s*за\s+всех\s+пассажиров",
            ],
            price_min=self.PRICE_MIN,
            price_max=self.PRICE_MAX,
        )
        if rendered_price is not None:
            return rendered_price

        for raw in re.findall(r"(\d{1,3}(?:[ \u00A0]\d{3})+|\d{4,6})\s*₽", response.text, flags=re.IGNORECASE):
            numeric = int(re.sub(r"\D", "", raw))
            if self.PRICE_MIN <= numeric <= self.PRICE_MAX:
                return numeric

        return None

    def _extract_kupibilet_calendar_price(self, text: str, departure_date: date | None, return_date: date | None) -> int | None:
        if not departure_date or not return_date:
            return None

        months = {1: "янв", 2: "фев", 3: "мар", 4: "апр", 5: "май", 6: "июн", 7: "июл", 8: "авг", 9: "сен", 10: "окт", 11: "ноя", 12: "дек"}
        dep = f"{departure_date.day}\\s*{months[departure_date.month]}"
        ret = f"{return_date.day}\\s*{months[return_date.month]}"
        pattern = rf"{dep}\\s*[—-]\\s*{ret}.{{0,80}}?(\\d{{1,3}}(?:[ \\u00A0]\\d{{3}})+|\\d{{4,6}})\\s*₽"

        match = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
        if not match:
            return None

        numeric = int(re.sub(r"\D", "", match.group(1)))
        if self.PRICE_MIN <= numeric <= self.PRICE_MAX:
            return numeric
        return None

    @classmethod
    def _build_kupibilet_search_link(
        cls,
        origin: str,
        destination: str,
        departure_date: date | None,
        return_date: date | None,
    ) -> str:
        dep = departure_date.isoformat() if departure_date else datetime.now().date().isoformat()
        route0 = f"iatax:{origin}_{dep}_date_{dep}_iatax:{destination}"

        parts = [
            "https://www.kupibilet.ru/search?adult=1",
            "cabinClass=Y",
            "child=0",
            "childrenAges=[]",
            "infant=0",
            f"route[0]={route0}",
        ]

        if return_date:
            ret = return_date.isoformat()
            route1 = f"iatax:{destination}_{ret}_date_{ret}_iatax:{origin}"
            parts.append(f"route[1]={route1}")

        parts.append("v=2")
        parts.append(f"filter={cls.FILTER_PARAM}")
        return "&".join(parts)


