"""
Scraper for Aftenposten Vink restaurant recommendations.
Outputs to data/restaurants.json (NOT events.json — Vink articles are evergreen
restaurant reviews, not time-stamped events).

HTML structure (confirmed against live site 2026-04-08):
  <article class="teaser ...">
    <a class="teaser-link" href="/artikkel/{id}/{slug}">
      <div class="text-wrapper">
        <div class="title">Article title</div>
      </div>
    </a>
  </article>

Run standalone: python scrape_vink.py
"""
import json
import re
import sys
import requests
from bs4 import BeautifulSoup
from pathlib import Path

BASE_URL = "https://vink.aftenposten.no"
VINK_URL = BASE_URL + "/"

OUTPUT_PATHS = [
    Path(__file__).parent.parent / "data" / "restaurants.json",
    Path(__file__).parent.parent / "frontend" / "public" / "data" / "restaurants.json",
]


def scrape() -> list[dict]:
    res = requests.get(VINK_URL, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
    res.raise_for_status()
    soup = BeautifulSoup(res.text, "html.parser")

    restaurants = []
    for item in soup.select("article.teaser"):
        try:
            title_el = item.select_one(".title")
            link_el = item.select_one("a.teaser-link")

            if not title_el:
                continue

            title = title_el.get_text(strip=True)
            if not title:
                continue

            href = link_el["href"] if link_el else ""
            url = href if href.startswith("http") else BASE_URL + href

            restaurants.append({
                "id": f"vink-{re.sub(r'[^a-z0-9]', '-', title.lower())[:40]}",
                "title": title,
                "source": "vink",
                "url": url,
            })
        except Exception:
            continue

    return restaurants


if __name__ == "__main__":
    results = scrape()
    print(f"Found {len(results)} recommendations from Vink")
    for r in results[:3]:
        print(r)

    for path in OUTPUT_PATHS:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(results, ensure_ascii=False, indent=2))
        print(f"Written to {path}", file=sys.stderr)
