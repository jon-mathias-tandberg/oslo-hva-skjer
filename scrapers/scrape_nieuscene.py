"""
Scraper for Nieu Scene (nieuscene.no) - Oslo comedy and culture venue.
Returns a list of event dicts matching the events.json schema.

The site is built on Squarespace. Event programs are at:
  /program-grunerlokka  (Christian Kroghs Gate 60)
  /program-torshov      (Vogts gate 64)

Squarespace exposes a JSON endpoint for collection pages:
  GET /program-grunerlokka?format=json
  GET /program-torshov?format=json

Response contains a collection with an `items` array. Each item has:
  title, publishOn (epoch ms), fullUrl, body (HTML description)

NOTE: As of April 2026, both collections report itemCount=0 (no events posted).
The scraper will return an empty list until the venue populates their program pages.

Verify by running: python scrape_nieuscene.py
"""
import re
import requests
from datetime import datetime, timezone

BASE_URL = "https://www.nieuscene.no"

PROGRAM_PAGES = [
    "/program-grunerlokka",
    "/program-torshov",
]


def _fetch_collection(path: str) -> list[dict]:
    """Fetch a Squarespace collection page as JSON and return its items."""
    url = f"{BASE_URL}{path}?format=json"
    res = requests.get(
        url,
        timeout=15,
        headers={"User-Agent": "Mozilla/5.0"},
    )
    res.raise_for_status()
    data = res.json()

    # Squarespace collection JSON: top-level has 'collection' and 'items' keys
    items = data.get("items", [])
    if not items:
        # Some Squarespace versions nest items inside collection
        collection = data.get("collection", {})
        items = collection.get("items", [])
    return items


def _parse_item(item: dict) -> dict | None:
    """Convert a Squarespace item to an event dict."""
    try:
        title = (item.get("title") or "").strip()
        if not title:
            return None

        # publishOn is epoch milliseconds
        publish_on = item.get("publishOn")
        if publish_on:
            dt = datetime.fromtimestamp(publish_on / 1000, tz=timezone.utc)
        else:
            return None

        full_url = item.get("fullUrl", "")
        if full_url and not full_url.startswith("http"):
            full_url = BASE_URL + full_url

        # Strip HTML from body for a plain-text description
        body_html = item.get("body") or ""
        description = re.sub(r"<[^>]+>", " ", body_html).strip()[:200]

        slug = re.sub(r"[^a-z0-9]", "-", title.lower())[:30].strip("-")
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


def scrape() -> list[dict]:
    events = []
    seen_ids: set[str] = set()

    for path in PROGRAM_PAGES:
        try:
            items = _fetch_collection(path)
        except Exception:
            continue

        for item in items:
            event = _parse_item(item)
            if event and event["id"] not in seen_ids:
                seen_ids.add(event["id"])
                events.append(event)

    events.sort(key=lambda e: (e["date"], e.get("time") or ""))
    return events


if __name__ == "__main__":
    results = scrape()
    print(f"Found {len(results)} events from Nieu Scene")
    for e in results[:5]:
        print(e)
