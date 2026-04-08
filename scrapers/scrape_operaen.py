"""
Scraper for Den Norske Opera & Ballett (operaen.no).
Returns a list of event dicts matching the events.json schema.

Approach:
  1. Fetch the main forestillinger page to collect individual production URLs.
  2. For each production page, parse performance dates from the eventsList section.
     Dates appear as Norwegian text in h3 elements:
       "Torsdag 9. april" / "19:00 / Hovedscenen"
     or just:
       "Torsdag 9. april 19:00"
  3. Extract year from the page title or context (default current year + next year).

category: "kultur", source: "operaen"

Verify by running: python scrape_operaen.py
"""
import re
import requests
from bs4 import BeautifulSoup
from datetime import date, timedelta

BASE_URL = "https://www.operaen.no"
LISTING_URL = f"{BASE_URL}/forestillinger/"

HEADERS = {"User-Agent": "Mozilla/5.0"}

MONTH_NO = {
    "januar": 1, "februar": 2, "mars": 3, "april": 4,
    "mai": 5, "juni": 6, "juli": 7, "august": 8,
    "september": 9, "oktober": 10, "november": 11, "desember": 12,
}

DAY_NO = {
    "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag", "søndag",
}


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "-", text.lower())[:30].strip("-")


def _get_production_urls() -> list[tuple[str, str]]:
    """Fetch listing page and extract (title, url) pairs for individual productions."""
    res = requests.get(LISTING_URL, timeout=15, headers=HEADERS)
    res.raise_for_status()
    soup = BeautifulSoup(res.text, "html.parser")

    productions = []
    seen = set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        # Individual production pages: /forestillinger/something/ (not root)
        if re.match(r"^/forestillinger/[^/]+/?$", href) and href not in seen:
            seen.add(href)
            title = a.get_text(strip=True) or href.split("/")[-2].replace("-", " ").title()
            full_url = BASE_URL + href.rstrip("/") + "/"
            productions.append((title, full_url))

    return productions


def _parse_norwegian_date(date_str: str, year_hint: int) -> date | None:
    """
    Parse Norwegian date strings like:
      'Torsdag 9. april'
      'Fredag 17. april'
    Returns a date object or None.
    """
    # Remove day name
    s = date_str.strip()
    for day in DAY_NO:
        s = re.sub(r"(?i)^" + day + r"\s*", "", s).strip()

    m = re.search(r"(\d{1,2})\.\s*(\w+)", s)
    if not m:
        return None
    day_num = int(m.group(1))
    month_name = m.group(2).lower()
    month_num = MONTH_NO.get(month_name)
    if not month_num:
        return None

    today = date.today()
    # Determine year: use hint but roll over if date is in the past
    for year in [year_hint, year_hint + 1]:
        try:
            d = date(year, month_num, day_num)
            if d >= today - timedelta(days=7):
                return d
        except ValueError:
            continue
    return None


def _scrape_production(title: str, url: str) -> list[dict]:
    """Scrape all performance dates from a single production page.

    Actual DOM structure (confirmed by inspection):
      <li class="event">
        <div class="text">
          <div class="date">Torsdag 9. april</div>
          ...time text like "19:00 / Hovedscenen"...
        </div>
        ...
      </li>
    The full li text is: "Torsdag 9. april 19:00 / Hovedscenen Kjøp Få billetter"
    """
    try:
        res = requests.get(url, timeout=15, headers=HEADERS)
        res.raise_for_status()
    except Exception:
        return []

    soup = BeautifulSoup(res.text, "html.parser")
    today = date.today()

    # Get accurate title from h1.
    # Use separator=" " to preserve spaces between child spans,
    # and strip soft-hyphens (\xad) used for CSS word-break hints.
    page_title = title
    h1 = soup.find("h1")
    if h1:
        h1_text = h1.get_text(" ", strip=True).replace("\xad", "").strip()
        if h1_text:
            page_title = h1_text

    events = []

    # Primary: li.event elements (actual structure)
    for li in soup.find_all("li", class_="event"):
        # Date in div.date
        date_div = li.find("div", class_="date")
        if not date_div:
            continue
        date_text = date_div.get_text(strip=True)
        if not any(day in date_text.lower() for day in DAY_NO):
            continue

        d = _parse_norwegian_date(date_text, today.year)
        if d is None or d < today - timedelta(days=1):
            continue

        # Time: search full li text for HH:MM pattern
        full_text = li.get_text(" ", strip=True)
        t_match = re.search(r"(\d{2}):(\d{2})", full_text)
        time_str = f"{t_match.group(1)}:{t_match.group(2)}" if t_match else None

        slug = _slugify(page_title)
        suffix = time_str.replace(":", "") if time_str else "0000"
        event_id = f"operaen-{d.isoformat()}-{slug}-{suffix}"

        events.append({
            "id": event_id,
            "title": page_title,
            "date": d.isoformat(),
            "time": time_str,
            "category": "kultur",
            "source": "operaen",
            "url": url,
            "description": "",
        })

    # Fallback: search all text nodes for Norwegian date strings
    if not events:
        for text_node in soup.find_all(string=re.compile(
            r"(?:mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag)\s+\d{1,2}\.\s+\w+",
            re.IGNORECASE,
        )):
            text = str(text_node).strip()
            d = _parse_norwegian_date(text, today.year)
            if d is None or d < today - timedelta(days=1):
                continue
            # Look for time in surrounding context
            parent = text_node.parent
            full = parent.get_text(" ", strip=True) if parent else text
            t_match = re.search(r"(\d{2}):(\d{2})", full)
            time_str = f"{t_match.group(1)}:{t_match.group(2)}" if t_match else None
            slug = _slugify(page_title)
            suffix = time_str.replace(":", "") if time_str else "0000"
            event_id = f"operaen-{d.isoformat()}-{slug}-{suffix}"
            events.append({
                "id": event_id,
                "title": page_title,
                "date": d.isoformat(),
                "time": time_str,
                "category": "kultur",
                "source": "operaen",
                "url": url,
                "description": "",
            })

    return events


def scrape() -> list[dict]:
    try:
        productions = _get_production_urls()
    except Exception:
        productions = []

    # Always include known productions as fallback
    known = [
        ("Don Carlo", f"{BASE_URL}/forestillinger/don-carlo-opera/"),
        ("Tungrodd / Rahčamuš / Raataminen", f"{BASE_URL}/forestillinger/tungrodd-rahcamus-raataminen-ballett/"),
        ("La Bayadère", f"{BASE_URL}/forestillinger/la-bayadere-ballett/"),
    ]
    existing_urls = {url for _, url in productions}
    for title, url in known:
        if url not in existing_urls:
            productions.append((title, url))

    all_events: list[dict] = []
    seen_ids: set[str] = set()

    for title, url in productions:
        for event in _scrape_production(title, url):
            if event["id"] not in seen_ids:
                seen_ids.add(event["id"])
                all_events.append(event)

    all_events.sort(key=lambda e: (e["date"], e.get("time") or ""))
    return all_events


if __name__ == "__main__":
    results = scrape()
    print(f"Found {len(results)} events from Oslo Operaen")
    for e in results[:5]:
        print(e)
