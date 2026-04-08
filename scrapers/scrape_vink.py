"""
Scraper for Aftenposten Vink restaurant recommendations.
Returns a list of event dicts matching the events.json schema.

Verify selectors by running: python scrape_vink.py
"""
import re
import requests
from bs4 import BeautifulSoup
from datetime import date

BASE_URL = "https://www.aftenposten.no"
VINK_URL = f"{BASE_URL}/vink/restauranter"


def scrape() -> list[dict]:
    res = requests.get(VINK_URL, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
    res.raise_for_status()
    soup = BeautifulSoup(res.text, "html.parser")

    events = []
    today = date.today().strftime("%Y-%m-%d")

    # Vink lists restaurants, not time-bound events — we add them as standing recommendations
    # Selector: inspect aftenposten.no/vink/restauranter and update to match restaurant cards
    for item in soup.select("article, .article-teaser, [class*='teaser']"):
        try:
            title_el = item.select_one("h2, h3, [class*='title']")
            link_el = item.select_one("a[href]")

            if not title_el:
                continue

            title = title_el.get_text(strip=True)
            if not title:
                continue

            href = link_el["href"] if link_el else ""
            url = href if href.startswith("http") else BASE_URL + href

            events.append({
                "id": f"vink-{today}-{re.sub(r'[^a-z0-9]', '-', title.lower())[:30]}",
                "title": title,
                "date": today,
                "time": None,
                "category": "mat",
                "source": "vink",
                "url": url,
                "description": "Anbefalt av Aftenposten Vink",
            })
        except Exception:
            continue

    return events


if __name__ == "__main__":
    results = scrape()
    print(f"Found {len(results)} recommendations from Vink")
    for e in results[:3]:
        print(e)
