"""
Scraper for Oslo Nye Teater (oslonye.no).
Returns a list of event dicts matching the events.json schema.

Approach:
  1. Fetch /forestillinger/ listing page.
  2. Extract individual show URLs from .archive-forestillinger-cover .cell elements
     using data-gtm attribute (contains title) and the .les-mer-link href.
  3. For each show page, find performance date/time rows.
     Each performance appears as a div with 4 <p> elements:
       p[0]: day name (e.g. "Lørdag")
       p[1]: date in DD/MM-YY format (e.g. "19/09-26")
       p[2]: time (e.g. "19:00")
       p[3]: ticket link <a>
  4. Parse DD/MM-YY into a proper date.

category: "kultur", source: "oslonye"

Verify by running: python scrape_oslonye.py
"""
import json
import re
import requests
from bs4 import BeautifulSoup
from datetime import date, timedelta

BASE_URL = "https://oslonye.no"
LISTING_URL = f"{BASE_URL}/forestillinger/"

HEADERS = {"User-Agent": "Mozilla/5.0"}


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "-", text.lower())[:30].strip("-")


def _get_show_urls() -> list[tuple[str, str]]:
    """Return list of (title, url) for all shows on the listing page."""
    res = requests.get(LISTING_URL, timeout=15, headers=HEADERS)
    res.raise_for_status()
    soup = BeautifulSoup(res.text, "html.parser")

    shows = []
    seen = set()

    # Each show is in a .cell div with data-gtm JSON and a .les-mer-link anchor
    for cell in soup.find_all(attrs={"data-gtm": True}):
        try:
            gtm = json.loads(cell["data-gtm"])
            title = gtm.get("name", "").strip()
        except (json.JSONDecodeError, KeyError):
            title = ""

        link = cell.find("a", class_="les-mer-link") or cell.find("a", href=True)
        if not link:
            continue
        href = link["href"]
        if not href.startswith("http"):
            href = BASE_URL + href

        if href not in seen and "/forestillinger/" in href:
            seen.add(href)
            if not title:
                # Derive from URL slug
                slug = href.rstrip("/").split("/")[-1]
                title = slug.replace("-", " ").title()
            shows.append((title, href))

    # Fallback: all les-mer-link anchors
    if not shows:
        for a in soup.find_all("a", class_="les-mer-link"):
            href = a["href"]
            if not href.startswith("http"):
                href = BASE_URL + href
            if href not in seen and "/forestillinger/" in href:
                seen.add(href)
                slug = href.rstrip("/").split("/")[-1]
                shows.append((slug.replace("-", " ").title(), href))

    return shows


def _parse_date_str(date_str: str) -> date | None:
    """Parse DD/MM-YY format, e.g. '19/09-26' → date(2026, 9, 19)."""
    m = re.match(r"(\d{1,2})/(\d{1,2})-(\d{2})$", date_str.strip())
    if not m:
        return None
    day, month, year_2 = int(m.group(1)), int(m.group(2)), int(m.group(3))
    year = 2000 + year_2
    try:
        return date(year, month, day)
    except ValueError:
        return None


def _scrape_show(title: str, url: str) -> list[dict]:
    """Scrape all performance dates from a single show page.

    Actual DOM structure (confirmed by inspection):
      <div class="grid-x event">
        <div class="cell small-4">   ← day + date combined: "Torsdag03/09-26"
          <div class="day">Torsdag</div>
          <div class="date">03/09-26</div>
        </div>
        <div class="cell small-4">19:00</div>
        <div class="cell small-4 text-right">
          <a href="https://www.ticketmaster.no/...">Kjøp</a>
        </div>
      </div>
    """
    try:
        res = requests.get(url, timeout=15, headers=HEADERS)
        res.raise_for_status()
    except Exception:
        return []

    soup = BeautifulSoup(res.text, "html.parser")
    today = date.today()

    # Try to get accurate title from h1
    h1 = soup.find("h1")
    if h1:
        h1_text = h1.get_text(strip=True)
        if h1_text:
            title = h1_text

    events = []

    # Each performance row is a div with classes including "event"
    for event_div in soup.find_all("div", class_="event"):
        cells = event_div.find_all("div", class_="cell")
        if len(cells) < 2:
            continue

        # First cell: date (contains div.date with DD/MM-YY)
        date_inner = cells[0].find("div", class_="date")
        date_text = date_inner.get_text(strip=True) if date_inner else cells[0].get_text(strip=True)

        # Extract DD/MM-YY pattern
        m = re.search(r"(\d{1,2})/(\d{1,2})-(\d{2})", date_text)
        if not m:
            continue
        d = _parse_date_str(m.group(0))
        if d is None or d < today - timedelta(days=1):
            continue

        # Second cell: time
        time_text = cells[1].get_text(strip=True) if len(cells) > 1 else ""
        time_match = re.search(r"(\d{2}):(\d{2})", time_text)
        time_str = f"{time_match.group(1)}:{time_match.group(2)}" if time_match else None

        # Third cell: ticket link
        ticket_link = None
        if len(cells) > 2:
            a = cells[2].find("a", href=True)
            if a:
                ticket_link = a["href"]

        slug = _slugify(title)
        suffix = time_str.replace(":", "") if time_str else "0000"
        event_id = f"oslonye-{d.isoformat()}-{slug}-{suffix}"

        events.append({
            "id": event_id,
            "title": title,
            "date": d.isoformat(),
            "time": time_str,
            "category": "kultur",
            "source": "oslonye",
            "url": ticket_link or url,
            "description": "",
        })

    return events


def scrape() -> list[dict]:
    try:
        shows = _get_show_urls()
    except Exception:
        shows = []

    all_events: list[dict] = []
    seen_ids: set[str] = set()

    for title, url in shows:
        for event in _scrape_show(title, url):
            if event["id"] not in seen_ids:
                seen_ids.add(event["id"])
                all_events.append(event)

    all_events.sort(key=lambda e: (e["date"], e.get("time") or ""))
    return all_events


if __name__ == "__main__":
    results = scrape()
    print(f"Found {len(results)} events from Oslo Nye Teater")
    for e in results[:5]:
        print(e)
