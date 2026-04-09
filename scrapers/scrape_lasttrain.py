"""
Scraper for Last Train Oslo (lasttrain.no).
Returns a list of event dicts matching the events.json schema.

Last Train uses the broadcast.events platform — same JSON API as Blå and Rockefeller:
  GET https://www.lasttrain.no/api/eventsEdge?

Verify by running: python scrape_lasttrain.py
"""
import re
import requests
from dateutil import parser as dateparser

BASE_URL = "https://www.lasttrain.no"
API_URL = f"{BASE_URL}/api/eventsEdge?"


def _slugify(name: str) -> str:
    return re.sub(r"\s+", "-", name.strip().lower())


def scrape() -> list[dict]:
    res = requests.get(API_URL, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
    res.raise_for_status()
    data = res.json()

    events = []
    for item in data:
        try:
            title = item["name"].strip()
            raw_date = item["start_time"]
            parsed = dateparser.parse(raw_date)
            if not parsed:
                continue

            event_id = item["id"]
            slug = _slugify(title)
            url = f"{BASE_URL}/events/{slug}/{event_id}"

            cf = item.get("custom_fields", {})
            ticket_url = cf.get("ticketUrl", "")
            if ticket_url:
                url = ticket_url

            description = item.get("details", "")[:200] if item.get("details") else ""

            events.append({
                "id": f"lasttrain-{parsed.strftime('%Y-%m-%d')}-{re.sub(r'[^a-z0-9]', '-', title.lower())[:30]}",
                "title": title,
                "date": parsed.strftime("%Y-%m-%d"),
                "time": parsed.strftime("%H:%M") if parsed.hour else None,
                "category": "konsert",
                "source": "lasttrain",
                "url": url,
                "description": description,
            })
        except Exception:
            continue

    return events


if __name__ == "__main__":
    results = scrape()
    print(f"Found {len(results)} events from Last Train")
    for e in results[:3]:
        print(e)
