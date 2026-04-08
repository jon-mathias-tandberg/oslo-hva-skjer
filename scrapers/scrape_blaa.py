"""
Scraper for Blå Oslo (blaaoslo.no).
Returns a list of event dicts matching the events.json schema.

Verify selectors by running: python scrape_blaa.py
"""
import re
import requests
from bs4 import BeautifulSoup
from dateutil import parser as dateparser

BASE_URL = "https://www.blaaoslo.no"
EVENTS_URL = f"{BASE_URL}/program"


def scrape() -> list[dict]:
    res = requests.get(EVENTS_URL, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
    res.raise_for_status()
    soup = BeautifulSoup(res.text, "html.parser")

    events = []
    # Selector: inspect blaaoslo.no/program and update this selector to match event list items
    for item in soup.select("article.event, .event-item, li.program-item"):
        try:
            title_el = item.select_one("h2, h3, .event-title, .title")
            date_el = item.select_one("time, .date, .event-date")
            link_el = item.select_one("a[href]")

            if not title_el or not date_el:
                continue

            title = title_el.get_text(strip=True)
            raw_date = date_el.get("datetime") or date_el.get_text(strip=True)
            parsed = dateparser.parse(raw_date, dayfirst=True)
            if not parsed:
                continue

            href = link_el["href"] if link_el else ""
            url = href if href.startswith("http") else BASE_URL + href

            events.append({
                "id": f"blaa-{parsed.strftime('%Y-%m-%d')}-{re.sub(r'[^a-z0-9]', '-', title.lower())[:30]}",
                "title": title,
                "date": parsed.strftime("%Y-%m-%d"),
                "time": parsed.strftime("%H:%M") if parsed.hour else None,
                "category": "konsert",
                "source": "blaa",
                "url": url,
                "description": "",
            })
        except Exception:
            continue

    return events


if __name__ == "__main__":
    results = scrape()
    print(f"Found {len(results)} events from Blå")
    for e in results[:3]:
        print(e)
