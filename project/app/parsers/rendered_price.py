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


def _normalize_kupibilet_card_text(value: str) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    if not text:
        return ""
    text = re.sub(r"(?:скидка\s*)?[−-]?\s*\d{1,2}%\s*[∙·•]?\s*\d{1,2}:\d{2}:\d{2}", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\b\d{1,2}:\d{2}:\d{2}\b", "", text)
    return re.sub(r"\s+", " ", text).strip()


def _build_kupibilet_card_fingerprint(card: dict) -> str:
    link_text = re.sub(r"\s+", "", str(card.get("link_text") or "").strip())
    current_price_text = _normalize_kupibilet_card_text(str(card.get("current_price_text") or ""))
    original_price_text = _normalize_kupibilet_card_text(str(card.get("original_price_text") or ""))
    tag_text = _normalize_kupibilet_card_text(str(card.get("tag_text") or ""))
    body_text = _normalize_kupibilet_card_text(str(card.get("text") or ""))
    json_text = _normalize_kupibilet_card_text(str(card.get("json") or ""))

    body_signature = body_text or json_text
    if link_text and body_signature:
        return f"{link_text}::{current_price_text}::{original_price_text}::{body_signature}"
    if body_signature:
        return f"{current_price_text}::{original_price_text}::{body_signature}"
    return link_text


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


def extract_rendered_page_payload(
    url: str,
    timeout_ms: int = 45000,
    selector: str = "body",
) -> tuple[str, str] | None:
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
            text = locator.inner_text().strip()
            html = page.content()
            browser.close()
    except Exception:
        return None

    return text or "", html or ""


def extract_rendered_nested_text_price(
    url: str,
    parent_selector: str,
    child_selector: str,
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
                page.wait_for_selector(parent_selector, timeout=min(timeout_ms, 12000))
            except Exception:
                pass
            parent = page.locator(parent_selector).first
            if parent.count() == 0:
                browser.close()
                return None
            child = parent.locator(child_selector).first
            if child.count() == 0:
                browser.close()
                return None
            raw_value = child.inner_text().strip()
            browser.close()
    except Exception:
        return None

    numeric = int(re.sub(r"\D", "", raw_value)) if raw_value else 0
    if price_min <= numeric <= price_max:
        return numeric
    return None


def extract_rendered_ticket_cards(
    url: str,
    limit: int = 10,
    timeout_ms: int = 45000,
) -> list[dict]:
    try:
        from playwright.sync_api import sync_playwright
    except Exception:
        return []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(locale="ru-RU", user_agent="Mozilla/5.0")
            page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
            try:
                page.wait_for_load_state("networkidle", timeout=min(timeout_ms, 12000))
            except Exception:
                pass
            page.wait_for_timeout(5000)
            cards = page.eval_on_selector_all(
                '[data-testid="serp-ticket-item"]',
                """
                (nodes, cardLimit) => nodes.slice(0, cardLimit).map((node) => {
                  const button = node.querySelector('[data-testid="ticket-price-button"]');
                  const priceNode = node.querySelector('[data-testid="serp-ticket-total-sum"]');
                  const baggageNode = node.querySelector('[data-testid="baggage-selection"]');
                  const priceText = priceNode ? (priceNode.innerText || '') : '';
                  const baggageText = baggageNode ? (baggageNode.innerText || '') : '';
                  const fullText = node.innerText || '';
                  return {
                    href: button ? (button.getAttribute('href') || '') : '',
                    price_text: priceText,
                    baggage_text: baggageText,
                    text: fullText,
                  };
                })
                """,
                limit,
            )
            browser.close()
    except Exception:
        return []

    return cards or []


def extract_rendered_kupibilet_special_cards(
    url: str,
    limit: int = 30,
    timeout_ms: int = 45000,
    deep_scan: bool = True,
) -> list[dict]:
    try:
        from playwright.sync_api import sync_playwright
    except Exception:
        return []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(locale="ru-RU", user_agent="Mozilla/5.0")
            page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
            try:
                page.wait_for_load_state("networkidle", timeout=min(timeout_ms, 12000))
            except Exception:
                pass

            # Kupibilet special cards often appear in waves after the initial paint.
            # Wait until the card count stabilizes before taking the snapshot.
            cards_locator = page.locator(".TicketCard_card__yyKN7")
            stable_rounds = 0
            last_count = -1
            for _ in range(4):
                current_count = cards_locator.count()
                if current_count > 0 and current_count == last_count:
                    stable_rounds += 1
                else:
                    stable_rounds = 0
                    last_count = current_count
                if current_count > 0 and stable_rounds >= 2:
                    break
                page.wait_for_timeout(220)

            all_cards: list[dict] = []
            seen_keys: set[str] = set()
            stagnant_rounds = 0
            last_scroll_y = -1

            def wait_cards_stable() -> None:
                stable_rounds = 0
                last_count = -1
                for _ in range(3):
                    current_count = cards_locator.count()
                    if current_count > 0 and current_count == last_count:
                        stable_rounds += 1
                    else:
                        stable_rounds = 0
                        last_count = current_count
                    if current_count > 0 and stable_rounds >= 2:
                        break
                    page.wait_for_timeout(160)

            def collect_visible_cards() -> int:
                added = 0
                visible_count = cards_locator.count()
                for index in range(visible_count):
                    card_node = cards_locator.nth(index)
                    try:
                        text = card_node.inner_text(timeout=2500) or ""
                    except Exception:
                        text = ""

                    raw_text = ""
                    try:
                        raw_text = card_node.text_content(timeout=1800) or ""
                    except Exception:
                        raw_text = ""

                    json_text = ""
                    script_node = card_node.locator("script").first
                    try:
                        if script_node.count() > 0:
                            json_text = script_node.text_content(timeout=1200) or ""
                    except Exception:
                        json_text = ""

                    tag_text = ""
                    tag_node = card_node.locator(
                        ".HotTicketCard_tagMainPage__tRwae, .LoopholeCard_tag__09_OF, [class*='HotTicketCard_tag'], [class*='LoopholeCard_tag'], [class*='tagMainPage'], [class*='tag__']"
                    ).first
                    try:
                        if tag_node.count() > 0:
                            tag_text = tag_node.inner_text(timeout=1200) or ""
                    except Exception:
                        tag_text = ""
                    if not tag_text:
                        try:
                            if tag_node.count() > 0:
                                tag_text = tag_node.text_content(timeout=1200) or ""
                        except Exception:
                            tag_text = ""

                    original_price_text = ""
                    old_price_node = card_node.locator("[class*='TicketCard_originalPrice__']").first
                    try:
                        if old_price_node.count() > 0:
                            original_price_text = old_price_node.inner_text(timeout=1200) or ""
                    except Exception:
                        original_price_text = ""

                    current_price_text = ""
                    price_node = card_node.locator("[class*='TicketCard_price__']").first
                    try:
                        if price_node.count() > 0:
                            current_price_text = price_node.inner_text(timeout=1200) or ""
                    except Exception:
                        current_price_text = ""

                    link_text = ""
                    link_node = card_node.locator(
                        "a[href*='/mbooking/step'], a[href*='/booking/step'], [href*='/mbooking/step'], [href*='/booking/step']"
                    ).first
                    try:
                        if link_node.count() > 0:
                            link_text = link_node.get_attribute("href", timeout=1200) or ""
                    except Exception:
                        link_text = ""

                    if not link_text:
                        try:
                            link_text = card_node.evaluate(
                                """
                                (node) => {
                                  const candidate = node.closest('a[href]') || node.querySelector('a[href], [href]');
                                  return candidate ? String(candidate.getAttribute('href') || '') : '';
                                }
                                """
                            ) or ""
                        except Exception:
                            link_text = ""

                    card = {
                        "text": text,
                        "raw_text": raw_text,
                        "json": json_text,
                        "tag_text": tag_text,
                        "original_price_text": original_price_text,
                        "current_price_text": current_price_text,
                        "link_text": link_text,
                    }
                    fingerprint = _build_kupibilet_card_fingerprint(card)
                    if not fingerprint or fingerprint in seen_keys:
                        continue
                    seen_keys.add(fingerprint)
                    all_cards.append(card)
                    added += 1
                    if len(all_cards) >= max(1, limit):
                        break
                return added

            def collect_all_scrolled_cards() -> None:
                nonlocal stagnant_rounds, last_scroll_y
                stagnant_rounds = 0
                last_scroll_y = -1
                for _ in range(4):
                    added_this_round = collect_visible_cards()

                    if len(all_cards) >= max(1, limit):
                        break

                    if added_this_round == 0:
                        stagnant_rounds += 1
                    else:
                        stagnant_rounds = 0

                    current_scroll_y = page.evaluate("() => window.scrollY")
                    if stagnant_rounds >= 3 and current_scroll_y == last_scroll_y:
                        break

                    last_scroll_y = current_scroll_y
                    try:
                        page.mouse.wheel(0, 2600)
                        page.wait_for_timeout(180)
                    except Exception:
                        break

            top_category_texts = page.evaluate(
                """
                () => {
                  const nodes = Array.from(document.querySelectorAll('button, [role="button"]'));
                  const values = [];
                  for (const node of nodes) {
                    const cls = String(node.className || '');
                    const text = String(node.innerText || node.textContent || '').trim();
                    if (!text) {
                      continue;
                    }
                    if (cls.includes('_tag_') && !values.includes(text)) {
                      values.push(text);
                    }
                  }
                  return values;
                }
                """
            ) or []

            if not deep_scan:
                collect_all_scrolled_cards()
                cards = all_cards[: max(1, limit)]
                browser.close()
                return cards or []

            def collect_carousel_cards() -> None:
                for _ in range(2):
                    carousel_buttons = page.locator("button[class*='_rightBtn_'], [role='button'][class*='_rightBtn_']")
                    try:
                        carousel_count = carousel_buttons.count()
                    except Exception:
                        carousel_count = 0

                    if carousel_count <= 0:
                        break

                    moved_any = False
                    for button_index in range(carousel_count):
                        if len(all_cards) >= max(1, limit):
                            return
                        for _ in range(6):
                            if len(all_cards) >= max(1, limit):
                                return
                            try:
                                next_button = carousel_buttons.nth(button_index)
                                if next_button.count() == 0 or next_button.is_disabled():
                                    break
                                next_button.scroll_into_view_if_needed(timeout=1500)
                                next_button.click(timeout=2500)
                                moved_any = True
                                page.wait_for_timeout(140)
                                wait_cards_stable()
                                before_count = len(all_cards)
                                collect_all_scrolled_cards()
                                if len(all_cards) == before_count:
                                    break
                            except Exception:
                                break
                    if not moved_any:
                        break

            collect_all_scrolled_cards()
            collect_carousel_cards()

            for category_text in top_category_texts:
                if len(all_cards) >= max(1, limit):
                    break
                try:
                    page.evaluate("() => window.scrollTo(0, 0)")
                    page.wait_for_timeout(80)
                    category_button = page.locator("button").filter(has_text=str(category_text)).first
                    if category_button.count() == 0:
                        category_button = page.locator("[role='button']").filter(has_text=str(category_text)).first
                    if category_button.count() == 0:
                        continue
                    category_button.scroll_into_view_if_needed(timeout=1500)
                    category_button.click(timeout=3000)
                    page.wait_for_timeout(180)
                    wait_cards_stable()
                    collect_all_scrolled_cards()
                    collect_carousel_cards()
                except Exception:
                    continue

            cards = all_cards[: max(1, limit)]
            browser.close()
    except Exception:
        return []

    return cards or []

