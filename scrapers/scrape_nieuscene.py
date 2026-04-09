"""
Scraper for Nieu Scene (nieuscene.no) - Oslo comedy and culture venue.
Returns a list of event dicts matching the events.json schema.

The site embeds a SociableKit Facebook Page Events widget on:
  /program-grunerlokka  (Christian Kroghs Gate 60) - embed_id 25613563
  /program-torshov      (Vogts gate 64)             - embed_id 89090

Events are fetched from the SociableKit/AccentAPI data feed:
  https://data.accentapi.com/feed/{embed_id}.json

Each event item has:
  start_date_raw  (YYYY-MM-DD, local Oslo time)
  start_time_raw  (ISO UTC, e.g. 2026-05-21T17:00:00.000Z)
  start_time      (human readable, e.g. "7:00 pm")
  name            (event title)
  description     (HTML)
  html_link       (Facebook event URL)
  event_id        (Facebook event ID)
"""
import re
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone, timedelta

BASE_URL = "https://www.nieuscene.no"
FEED_URL = "https://data.accentapi.com/feed/{embed_id}.json"

VENUES = [
    {"path": "/program-grunerlokka", "embed_id": "25613563", "name": "Grünerløkka"},
    {"path": "/program-torshov",     "embed_id": "89090",    "name": "Torshov"},
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.nieuscene.no/",
}


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "-", text.lower())[:30].strip("-")


def _parse_time(start_time_raw: str) -> str | None:
    """
    Convert UTC ISO timestamp to Oslo local time (CET/CEST).
    Uses a simple offset: UTC+1 in winter, UTC+2 in summer (last Sun Mar–last Sun Oct).
    Returns HH:MM string or None if unparseable.
    """
    if not start_time_raw:
        return None
    try:
        # Parse as UTC
        dt_utc = datetime.fromisoformat(
            start_time_raw.replace("Z", "+00:00").replace(".000+00:00", "+00:00")
        )
        # Determine Oslo offset (CEST UTC+2 from last Sun of March to last Sun of October)
        year = dt_utc.year

        def last_sunday(year: int, month: int) -> datetime:
            import calendar
            last_day = calendar.monthrange(year, month)[1]
            d = datetime(year, month, last_day)
            d -= timedelta(days=d.weekday() + 1)
            return d.replace(tzinfo=timezone.utc)

        cest_start = last_sunday(year, 3).replace(hour=1)
        cest_end = last_sunday(year, 10).replace(hour=1)
        if cest_start <= dt_utc < cest_end:
            local_dt = dt_utc + timedelta(hours=2)
        else:
            local_dt = dt_utc + timedelta(hours=1)

        return local_dt.strftime("%H:%M")
    except Exception:
        return None


def _strip_html(html: str) -> str:
    """Strip HTML tags and return plain text, truncated to 300 chars."""
    text = BeautifulSoup(html, "html.parser").get_text(" ", strip=True)
    return text[:300]


def _fetch_events(embed_id: str, venue_path: str) -> list[dict]:
    """Fetch events from AccentAPI feed for a SociableKit embed_id."""
    url = FEED_URL.format(embed_id=embed_id)
    res = requests.get(url, timeout=20, headers=HEADERS)
    res.raise_for_status()
    data = res.json()

    events_raw = data.get("events", [])
    today = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")

    events: list[dict] = []
    seen_ids: set[str] = set()

    for item in events_raw:
        try:
            date_str = item.get("start_date_raw", "")
            if not date_str or date_str < today:
                continue

            title = (item.get("name") or "").strip()
            if not title:
                continue

            time_str = _parse_time(item.get("start_time_raw", ""))
            fb_url = item.get("html_link", "") or BASE_URL + venue_path
            event_id_raw = item.get("event_id", "")
            description_html = item.get("description", "")
            description = _strip_html(description_html) if description_html else ""

            event_id = f"nieuscene-{event_id_raw}" if event_id_raw else (
                f"nieuscene-{date_str}-{_slugify(title)}"
            )

            if event_id in seen_ids:
                continue
            seen_ids.add(event_id)

            events.append({
                "id": event_id,
                "title": title,
                "date": date_str,
                "time": time_str,
                "category": "humor",
                "source": "nieuscene",
                "url": fb_url,
                "description": description,
            })
        except Exception:
            continue

    return events


def scrape() -> list[dict]:
    all_events: list[dict] = []
    seen_ids: set[str] = set()

    for venue in VENUES:
        try:
            events = _fetch_events(venue["embed_id"], venue["path"])
            for event in events:
                if event["id"] not in seen_ids:
                    seen_ids.add(event["id"])
                    all_events.append(event)
        except Exception as exc:
            print(f"[nieuscene] Failed to fetch {venue['name']}: {exc}")

    all_events.sort(key=lambda e: (e["date"], e.get("time") or ""))
    return all_events


if __name__ == "__main__":
    results = scrape()
    print(f"Found {len(results)} events from Nieu Scene")
    for e in results[:5]:
        print(e)
