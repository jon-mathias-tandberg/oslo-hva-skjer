"""
Scraper for Nieu Scene (nieuscene.no) - Oslo comedy and culture venue.
Returns a list of event dicts matching the events.json schema.

The site is built on Squarespace. Event programs are at:
  /program-grunerlokka  (Christian Kroghs Gate 60)
  /program-torshov      (Vogts gate 64)

Approach:
1. Try Squarespace JSON endpoint (?format=json) for each page.
2. If itemCount==0 or items empty, fall back to HTML scraping for
   article/event entries using BeautifulSoup.

As of April 2026 both collections have itemCount=0 (no events posted yet),
so the scraper returns an empty list until the venue populates their pages.

Verify by running: python scrape_nieuscene.py
"""
import re
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone

BASE_URL = "https://www.nieuscene.no"

PROGRAM_PAGES = [
    "/program-grunerlokka",
    "/program-torshov",
]

HEADERS = {"User-Agent": "Mozilla/5.0"}

MONTH_NO = {
    "januar": 1, "februar": 2, "mars": 3, "april": 4,
    "mai": 5, "juni": 6, "juli": 7, "august": 8,
    "september": 9, "oktober": 10, "november": 11, "desember": 12,
}


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "-", text.lower())[:30].strip("-")


def _fetch_json(path: str) -> list[dict]:
    """Try Squarespace JSON endpoint; returns item list (may be empty)."""
    url = f"{BASE_URL}{path}?format=json"
    res = requests.get(url, timeout=15, headers=HEADERS)
    res.raise_for_status()
    data = res.json()
    items = data.get("items", [])
    if not items:
        items = data.get("collection", {}).get("items", [])
    return items


def _parse_json_item(item: dict) -> dict | None:
    """Convert a Squarespace JSON item to an event dict."""
    try:
        title = (item.get("title") or "").strip()
        if not title:
            return None
        publish_on = item.get("publishOn")
        if publish_on:
            dt = datetime.fromtimestamp(publish_on / 1000, tz=timezone.utc)
        else:
            return None
        full_url = item.get("fullUrl", "")
        if full_url and not full_url.startswith("http"):
            full_url = BASE_URL + full_url
        body_html = item.get("body") or ""
        description = re.sub(r"<[^>]+>", " ", body_html).strip()[:200]
        slug = _slugify(title)
        event_id = f"nieuscene-{dt.strftime('%Y-%m-%d')}-{slug}"
        return {
            "id": event_id,
            "title": title,
            "date": dt.strftime("%Y-%m-%d"),
            "time": dt.strftime("%H:%M") if dt.hour else None,
            "category": "humor",
            "source": "nieuscene",
            "url": full_url or BASE_URL,
            "description": description,
        }
    except Exception:
        return None


def _fetch_html(path: str) -> list[dict]:
    """Fallback: parse HTML for event entries using BeautifulSoup."""
    url = f"{BASE_URL}{path}"
    res = requests.get(url, timeout=15, headers=HEADERS)
    res.raise_for_status()
    soup = BeautifulSoup(res.text, "html.parser")

    events = []
    # Squarespace blog/event collections use article tags or divs with data-record-type
    for article in soup.find_all("article"):
        try:
            title_tag = article.find(["h1", "h2", "h3", "h4"])
            title = title_tag.get_text(strip=True) if title_tag else ""
            if not title:
                continue

            link_tag = article.find("a", href=True)
            href = link_tag["href"] if link_tag else ""
            if href and not href.startswith("http"):
                href = BASE_URL + href

            # Try to find a date in the article text
            text = article.get_text(" ", strip=True)
            date_match = re.search(
                r"(\d{1,2})\.\s*(januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)\s*(\d{4})",
                text, re.IGNORECASE
            )
            time_match = re.search(r"(\d{2}):(\d{2})", text)

            if date_match:
                day = int(date_match.group(1))
                month = MONTH_NO.get(date_match.group(2).lower(), 0)
                year = int(date_match.group(3))
                if not month:
                    continue
                from datetime import date as date_cls
                event_date = date_cls(year, month, day)
            else:
                continue

            time_str = f"{time_match.group(1)}:{time_match.group(2)}" if time_match else None
            slug = _slugify(title)
            event_id = f"nieuscene-{event_date.isoformat()}-{slug}"

            events.append({
                "id": event_id,
                "title": title,
                "date": event_date.isoformat(),
                "time": time_str,
                "category": "humor",
                "source": "nieuscene",
                "url": href or url,
                "description": "",
            })
        except Exception:
            continue

    return events


def scrape() -> list[dict]:
    events: list[dict] = []
    seen_ids: set[str] = set()

    for path in PROGRAM_PAGES:
        page_events: list[dict] = []
        try:
            items = _fetch_json(path)
            for item in items:
                event = _parse_json_item(item)
                if event:
                    page_events.append(event)
        except Exception:
            pass

        # If JSON returned nothing, try HTML fallback
        if not page_events:
            try:
                page_events = _fetch_html(path)
            except Exception:
                pass

        for event in page_events:
            if event["id"] not in seen_ids:
                seen_ids.add(event["id"])
                events.append(event)

    events.sort(key=lambda e: (e["date"], e.get("time") or ""))
    return events


if __name__ == "__main__":
    results = scrape()
    print(f"Found {len(results)} events from Nieu Scene")
    for e in results[:5]:
        print(e)
