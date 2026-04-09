"""
Scraper for Revolver Oslo (revolveroslo.ticketco.events).
Returns a list of event dicts matching the events.json schema.

The page embeds one <script type="application/ld+json"> block per event.
Each block is a schema.org Event with name, startDate, and url fields.

Verify by running: python scrape_revolver_ticketco.py
"""
import re
import json
import requests
from bs4 import BeautifulSoup
from dateutil import parser as dateparser

BASE_URL = "https://revolveroslo.ticketco.events"
EVENTS_URL = f"{BASE_URL}/no/nb"


def scrape() -> list[dict]:
    res = requests.get(EVENTS_URL, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
    res.raise_for_status()
    soup = BeautifulSoup(res.text, "html.parser")

    events = []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            if data.get("@type") != "Event":
                continue

            title = data.get("name", "").strip()
            raw_date = data.get("startDate", "")
            url = data.get("url", "")

            if not title or not raw_date:
                continue

            parsed = dateparser.parse(raw_date)
            if not parsed:
                continue

            events.append({
                "id": f"revolver-{parsed.strftime('%Y-%m-%d')}-{re.sub(r'[^a-z0-9]', '-', title.lower())[:30]}",
                "title": title,
                "date": parsed.strftime("%Y-%m-%d"),
                "time": parsed.strftime("%H:%M") if parsed.hour else None,
                "category": "konsert",
                "source": "revolver",
                "url": url if url.startswith("http") else BASE_URL + url,
                "description": "",
            })
        except Exception:
            continue

    return events


if __name__ == "__main__":
    results = scrape()
    print(f"Found {len(results)} events from Revolver Oslo")
    for e in results[:3]:
        print(e)
