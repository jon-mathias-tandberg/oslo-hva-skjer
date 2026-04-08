"""
Scraper for Folketeater (folketeaterpassasjen.no / folketeater.no).
Returns a list of event dicts matching the events.json schema.

The Folketeaterpassasjen site lists Folketeater (Norway's largest private
theater) as the main venue, but the event calendar lives at:
  https://www.folketeater.no/forestillinger/program/

Approach:
  1. Fetch /forestillinger/program/ - try to find show links.
  2. Fetch /forestillinger/kalender/ - try to find date entries.
  3. Parse any event entries found from HTML.

Note: The site is built on Craft CMS and likely JS-renders the calendar.
If the static HTML contains no events, returns an empty list and logs a warning.

category: "kultur", source: "folketeateret"

Verify by running: python scrape_folketeateret.py
"""
import re
import sys
import requests
from bs4 import BeautifulSoup
from datetime import date, timedelta

BASE_URL = "https://www.folketeater.no"
PROGRAM_URL = f"{BASE_URL}/forestillinger/program/"
KALENDER_URL = f"{BASE_URL}/forestillinger/kalender/"

HEADERS = {"User-Agent": "Mozilla/5.0"}

MONTH_NO = {
    "januar": 1, "februar": 2, "mars": 3, "april": 4,
    "mai": 5, "juni": 6, "juli": 7, "august": 8,
    "september": 9, "oktober": 10, "november": 11, "desember": 12,
    "jan": 1, "feb": 2, "mar": 3, "apr": 4,
    "aug": 8, "sep": 9, "okt": 10, "nov": 11, "des": 12,
}


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "-", text.lower())[:30].strip("-")


def _parse_date_time(text: str) -> tuple[date | None, str | None]:
    """Parse Norwegian date + time from arbitrary text."""
    today = date.today()
    time_match = re.search(r"(\d{2}):(\d{2})", text)
    time_str = f"{time_match.group(1)}:{time_match.group(2)}" if time_match else None

    # Format: DD. [month] YYYY
    m = re.search(r"(\d{1,2})\.\s*(\w+)\s+(\d{4})", text, re.IGNORECASE)
    if m:
        day, mon_name, year = int(m.group(1)), m.group(2).lower(), int(m.group(3))
        month_num = MONTH_NO.get(mon_name)
        if month_num:
            try:
                return date(year, month_num, day), time_str
            except ValueError:
                pass

    # Format: DD. [month] (no year)
    m2 = re.search(r"(\d{1,2})\.\s*(\w+)", text, re.IGNORECASE)
    if m2:
        day, mon_name = int(m2.group(1)), m2.group(2).lower()
        month_num = MONTH_NO.get(mon_name)
        if month_num:
            for year in [today.year, today.year + 1]:
                try:
                    d = date(year, month_num, day)
                    if d >= today - timedelta(days=7):
                        return d, time_str
                except ValueError:
                    continue

    return None, None


def _scrape_page(url: str) -> list[dict]:
    """Fetch a page and attempt to extract event entries."""
    try:
        res = requests.get(url, timeout=15, headers=HEADERS)
        res.raise_for_status()
    except Exception:
        return []

    soup = BeautifulSoup(res.text, "html.parser")
    today = date.today()
    events = []
    seen_ids: set[str] = set()

    # Strategy 1: Look for articles or event-like blocks with a date and title
    for article in soup.find_all(["article", "li", "div"], class_=re.compile(r"event|show|forestilling|program", re.I)):
        title_tag = article.find(["h1", "h2", "h3", "h4", "strong"])
        title = title_tag.get_text(strip=True) if title_tag else ""
        if not title:
            continue
        text = article.get_text(" ", strip=True)
        d, time_str = _parse_date_time(text)
        if d is None or d < today - timedelta(days=1):
            continue

        link = article.find("a", href=True)
        href = link["href"] if link else ""
        if href and not href.startswith("http"):
            href = BASE_URL + href

        slug = _slugify(title)
        suffix = time_str.replace(":", "") if time_str else "0000"
        event_id = f"folketeateret-{d.isoformat()}-{slug}-{suffix}"
        if event_id in seen_ids:
            continue
        seen_ids.add(event_id)
        events.append({
            "id": event_id,
            "title": title,
            "date": d.isoformat(),
            "time": time_str,
            "category": "kultur",
            "source": "folketeateret",
            "url": href or url,
            "description": "",
        })

    # Strategy 2: Find any td/th with date-like content next to show names
    for tr in soup.find_all("tr"):
        cells = tr.find_all(["td", "th"])
        if len(cells) < 2:
            continue
        row_text = tr.get_text(" ", strip=True)
        d, time_str = _parse_date_time(row_text)
        if d is None or d < today - timedelta(days=1):
            continue
        title = cells[0].get_text(strip=True)
        if not title:
            continue
        link = tr.find("a", href=True)
        href = link["href"] if link else ""
        if href and not href.startswith("http"):
            href = BASE_URL + href
        slug = _slugify(title)
        suffix = time_str.replace(":", "") if time_str else "0000"
        event_id = f"folketeateret-{d.isoformat()}-{slug}-{suffix}"
        if event_id in seen_ids:
            continue
        seen_ids.add(event_id)
        events.append({
            "id": event_id,
            "title": title,
            "date": d.isoformat(),
            "time": time_str,
            "category": "kultur",
            "source": "folketeateret",
            "url": href or url,
            "description": "",
        })

    return events


def scrape() -> list[dict]:
    all_events: list[dict] = []
    seen_ids: set[str] = set()

    for url in [PROGRAM_URL, KALENDER_URL]:
        for event in _scrape_page(url):
            if event["id"] not in seen_ids:
                seen_ids.add(event["id"])
                all_events.append(event)

    if not all_events:
        print(
            "WARNING: scrape_folketeateret found 0 events. "
            "The calendar is likely JS-rendered. "
            "Consider adding a headless browser or checking for an API.",
            file=sys.stderr,
        )

    all_events.sort(key=lambda e: (e["date"], e.get("time") or ""))
    return all_events


if __name__ == "__main__":
    results = scrape()
    print(f"Found {len(results)} events from Folketeater")
    for e in results[:5]:
        print(e)
