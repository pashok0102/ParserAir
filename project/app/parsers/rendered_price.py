from __future__ import annotations

import re
from typing import Iterable


def _collect_prices(payload: str, patterns: Iterable[str], price_min: int, price_max: int) -> list[int]:
    candidates: list[int] = []
    for pattern in patterns:
        for raw in re.findall(pattern, payload, flags=re.IGNORECASE | re.DOTALL):
            value = raw if isinstance(raw, str) else raw[0]
            numeric = int(re.sub(r"\D", "", value)) if value else 0
            if price_min <= numeric <= price_max:
                candidates.append(numeric)
    return candidates


def extract_rendered_price(
    url: str,
    patterns: Iterable[str],
    price_min: int = 3000,
    price_max: int = 500000,
    timeout_ms: int = 45000,
    pick: str = "first",
) -> int | None:
    try:
        from playwright.sync_api import sync_playwright
    except Exception:
        return None

    text = ""
    html = ""
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(locale="ru-RU", user_agent="Mozilla/5.0")
            page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
            page.wait_for_timeout(5000)
            text = page.inner_text("body")
            html = page.content()
            browser.close()
    except Exception:
        return None

    text_candidates = _collect_prices(text, patterns, price_min, price_max)

    # HTML mode: allow tags between chunks (e.g. "14906 ₽ <span>за всех пассажиров</span>").
    html_patterns = [
        p.replace(r"\s+", r"(?:\s|<[^>]+>)+") for p in patterns
    ]
    html_candidates = _collect_prices(html, html_patterns, price_min, price_max)

    all_candidates = text_candidates + html_candidates
    if not all_candidates:
        return None
    if pick == "min":
        return min(all_candidates)
    return all_candidates[0]


def extract_rendered_attr_price(
    url: str,
    selector: str,
    attribute: str,
    price_min: int = 3000,
    price_max: int = 500000,
    timeout_ms: int = 45000,
) -> int | None:
    try:
        from playwright.sync_api import sync_playwright
    except Exception:
        return None

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(locale="ru-RU", user_agent="Mozilla/5.0")
            page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
            try:
                page.wait_for_load_state("networkidle", timeout=min(timeout_ms, 10000))
            except Exception:
                pass
            try:
                page.wait_for_selector(selector, timeout=min(timeout_ms, 12000))
            except Exception:
                pass
            locator = page.locator(selector).first
            if locator.count() == 0:
                browser.close()
                return None
            raw_value = locator.get_attribute(attribute) or ""
            browser.close()
    except Exception:
        return None

    numeric = int(re.sub(r"\D", "", raw_value)) if raw_value else 0
    if price_min <= numeric <= price_max:
        return numeric
    return None


def extract_rendered_text_price(
    url: str,
    selector: str,
    price_min: int = 3000,
    price_max: int = 500000,
    timeout_ms: int = 45000,
) -> int | None:
    try:
        from playwright.sync_api import sync_playwright
    except Exception:
        return None

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(locale="ru-RU", user_agent="Mozilla/5.0")
            page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
            try:
                page.wait_for_load_state("networkidle", timeout=min(timeout_ms, 10000))
            except Exception:
                pass
            try:
                page.wait_for_selector(selector, timeout=min(timeout_ms, 12000))
            except Exception:
                pass
            locator = page.locator(selector).first
            if locator.count() == 0:
                browser.close()
                return None
            raw_value = locator.inner_text().strip()
            browser.close()
    except Exception:
        return None

    numeric = int(re.sub(r"\D", "", raw_value)) if raw_value else 0
    if price_min <= numeric <= price_max:
        return numeric
    return None


def extract_rendered_text_content(
    url: str,
    selector: str,
    timeout_ms: int = 45000,
) -> str | None:
    try:
        from playwright.sync_api import sync_playwright
    except Exception:
        return None

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(locale="ru-RU", user_agent="Mozilla/5.0")
            page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
            try:
                page.wait_for_load_state("networkidle", timeout=min(timeout_ms, 10000))
            except Exception:
                pass
            try:
                page.wait_for_selector(selector, timeout=min(timeout_ms, 12000))
            except Exception:
                pass
            locator = page.locator(selector).first
            if locator.count() == 0:
                browser.close()
                return None
            raw_value = locator.inner_text().strip()
            browser.close()
    except Exception:
        return None

    return raw_value or None

