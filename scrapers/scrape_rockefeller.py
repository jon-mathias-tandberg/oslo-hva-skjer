"""
Scraper for Rockefeller (rockefeller.no).
Returns a list of event dicts matching the events.json schema.

The site is a Next.js SPA (broadcast.events platform) that renders events
client-side. The full program is fetched from a public JSON API:
  GET https://www.rockefeller.no/api/eventsEdge?

Response: list of event objects with fields:
  id, name, start_time, tags, details, custom_fields, place

Event URL pattern: https://www.rockefeller.no/events/{slugified-name}/{id}

Verify selectors by running: python scrape_rockefeller.py
"""
import re
import requests
from dateutil import parser as dateparser

BASE_URL = "https://www.rockefeller.no"
API_URL = f"{BASE_URL}/api/eventsEdge?"


def _slugify(name: str) -> str:
    """Reproduce the broadcast.events slug function (lowercase, spaces→hyphens)."""
    return re.sub(r"\s+", "-", name.strip().lower())


def scrape() -> list[dict]:
    res = requests.get(API_URL, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
    res.raise_for_status()
    data = res.json()

    events = []
    for item in data:
        try:
            title = item["name"].strip()
            raw_date = item["start_time"]  # ISO 8601, e.g. "2026-04-08T17:00:00.000Z"
            parsed = dateparser.parse(raw_date)
            if not parsed:
                continue

            event_id = item["id"]
            slug = _slugify(title)
            url = f"{BASE_URL}/events/{slug}/{event_id}"

            # Use ticketUrl from custom_fields if available
            cf = item.get("custom_fields", {})
            ticket_url = cf.get("ticketUrl", "")
            if ticket_url:
                url = ticket_url

            description = item.get("details", "")[:200] if item.get("details") else ""

            # place field tells us which venue (Rockefeller, John Dee, Sentrum Scene, etc.)
            place = item.get("place", {}).get("name", "Rockefeller")

            events.append({
                "id": f"rockefeller-{parsed.strftime('%Y-%m-%d')}-{re.sub(r'[^a-z0-9]', '-', title.lower())[:30]}",
                "title": title,
                "date": parsed.strftime("%Y-%m-%d"),
                "time": parsed.strftime("%H:%M") if parsed.hour else None,
                "category": "konsert",
                "source": "rockefeller",
                "url": url,
                "description": description,
            })
        except Exception:
            continue

    return events


if __name__ == "__main__":
    results = scrape()
    print(f"Found {len(results)} events from Rockefeller")
    for e in results[:3]:
        print(e)
