"""
Scraper for Det Norske Teatret (detnorsketeatret.no).
Returns a list of event dicts matching the events.json schema.

The site is in Nynorsk. Performance pages are at /framsyningar/{show-slug}.

Approach:
  1. Fetch the main /framsyningar/ page and extract individual show URLs.
  2. For each show page, parse performance dates from <li> elements containing
     <strong> tags with date/time in format:
       "Laurdag 18. apr. 2026 / 17:00"
     or
       "DD. [month] kl. HH:MM"
  3. Ticket links follow pattern: billettar.detnorsketeatret.no/...

Norwegian Nynorsk day/month names handled:
  - Måndag, Tysdag, Onsdag, Torsdag, Fredag, Laurdag, Sundag
  - jan., feb., mars, apr., mai, juni, juli, aug., sep., okt., nov., des.

category: "kultur", source: "detnorske"

Verify by running: python scrape_detnorske.py
"""
import re
import requests
from bs4 import BeautifulSoup
from datetime import date, timedelta

BASE_URL = "https://www.detnorsketeatret.no"
LISTING_URL = f"{BASE_URL}/framsyningar"

HEADERS = {"User-Agent": "Mozilla/5.0"}

MONTH_NO = {
    # Full names
    "januar": 1, "februar": 2, "mars": 3, "april": 4,
    "mai": 5, "juni": 6, "juli": 7, "august": 8,
    "september": 9, "oktober": 10, "november": 11, "desember": 12,
    # Abbreviations
    "jan": 1, "feb": 2, "apr": 4,
    "aug": 8, "sep": 9, "okt": 10, "nov": 11, "des": 12,
}

DAY_NAMES_NN = {"måndag", "tysdag", "onsdag", "torsdag", "fredag", "laurdag", "sundag"}


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "-", text.lower())[:30].strip("-")


SITEMAP_URL = f"{BASE_URL}/sitemaps-1-section-play-1-sitemap.xml"

# Only check shows modified within the last N days to avoid fetching 387 pages.
SITEMAP_RECENCY_DAYS = 90


def _get_show_urls() -> list[tuple[str, str]]:
    """Fetch show URLs from the play sitemap (listing page is JS-rendered).

    Filters to pages with lastmod within SITEMAP_RECENCY_DAYS to avoid
    fetching all 387 historical show pages.
    """
    res = requests.get(SITEMAP_URL, timeout=15, headers=HEADERS)
    res.raise_for_status()

    today = date.today()
    cutoff = today - timedelta(days=SITEMAP_RECENCY_DAYS)

    # Parse loc + lastmod pairs
    entries = re.findall(
        r"<loc>(https://www\.detnorsketeatret\.no/framsyningar/[^<]+)</loc>"
        r".*?<lastmod>([^<]+)</lastmod>",
        res.text,
        re.DOTALL,
    )

    shows = []
    for url, lastmod in entries:
        try:
            mod_date = date.fromisoformat(lastmod[:10])
        except ValueError:
            mod_date = date.min
        if mod_date >= cutoff:
            slug = url.rstrip("/").split("/")[-1]
            title = slug.replace("-", " ").title()
            shows.append((title, url))

    return shows


def _parse_date_text(text: str) -> tuple[date | None, str | None]:
    """
    Parse Nynorsk date strings like:
      'Laurdag 18. apr. 2026 / 17:00'
      'Tysdag 21. apr. 2026 / 18:30'
      '14. april kl. 18:30'
    Returns (date, time_str) or (None, None).
    """
    # Time
    time_match = re.search(r"(\d{2}):(\d{2})", text)
    time_str = f"{time_match.group(1)}:{time_match.group(2)}" if time_match else None

    # Try full format: "DD. MON. YYYY"
    m = re.search(
        r"(\d{1,2})\.\s*(\w+)\.?\s+(\d{4})",
        text, re.IGNORECASE
    )
    if m:
        day = int(m.group(1))
        mon = m.group(2).lower().rstrip(".")
        year = int(m.group(3))
        month_num = MONTH_NO.get(mon)
        if month_num:
            try:
                return date(year, month_num, day), time_str
            except ValueError:
                pass

    # Try short format: "DD. MON" (no year — infer from current year)
    m2 = re.search(
        r"(\d{1,2})\.\s*(\w+)(?:\s+kl\.?)?",
        text, re.IGNORECASE
    )
    if m2:
        day = int(m2.group(1))
        mon = m2.group(2).lower().rstrip(".")
        month_num = MONTH_NO.get(mon)
        if month_num:
            today = date.today()
            for year in [today.year, today.year + 1]:
                try:
                    d = date(year, month_num, day)
                    if d >= today - timedelta(days=7):
                        return d, time_str
                except ValueError:
                    continue

    return None, None


def _scrape_show(title: str, url: str) -> list[dict]:
    """Scrape all performance dates from a single show page."""
    try:
        res = requests.get(url, timeout=15, headers=HEADERS)
        res.raise_for_status()
    except Exception:
        return []

    soup = BeautifulSoup(res.text, "html.parser")
    today = date.today()

    # Try to get better title from h1.
    # h1 contains two spans: a real one and an aria-hidden="copy" duplicate.
    # Use only the first non-aria-hidden span to avoid doubling.
    h1 = soup.find("h1")
    if h1:
        first_span = h1.find("span", attrs={"aria-hidden": False}) or h1.find("span")
        t = first_span.get_text(strip=True) if first_span else h1.get_text(strip=True)
        # Strip soft hyphens (\xad) used for CSS line-break hints
        t = t.replace("\xad", "").strip()
        if t:
            title = t

    events = []

    # Actual DOM structure (confirmed by inspection):
    #   <time class="day-and-time">
    #     <span class="hd-base day">Laurdag</span>
    #     <span class="body-sm date">18. apr. 2026\n\t.../\n\t...</span>
    #     <span class="body-sm time">17:00</span>
    #   </time>
    # Wrapped in a div.text, which is inside a performance container.
    # Ticket link is in a sibling/ancestor element.
    for time_el in soup.find_all("time", class_="day-and-time"):
        date_span = time_el.find("span", class_="date")
        time_span = time_el.find("span", class_="time")

        date_raw = date_span.get_text(strip=True) if date_span else ""
        time_raw = time_span.get_text(strip=True) if time_span else ""

        d, _ = _parse_date_text(date_raw)
        if d is None or d < today - timedelta(days=1):
            continue

        time_match = re.search(r"(\d{2}):(\d{2})", time_raw)
        time_str = f"{time_match.group(1)}:{time_match.group(2)}" if time_match else None

        # Ticket link: walk up to find nearest ancestor with a billettar link
        ticket_url = url
        container = time_el.parent  # div.text
        if container:
            container = container.parent  # performance item
        if container:
            a = container.find("a", href=lambda h: h and "billettar" in h)
            if a:
                ticket_url = a["href"]

        slug = _slugify(title)
        suffix = time_str.replace(":", "") if time_str else "0000"
        event_id = f"detnorske-{d.isoformat()}-{slug}-{suffix}"

        events.append({
            "id": event_id,
            "title": title,
            "date": d.isoformat(),
            "time": time_str,
            "category": "kultur",
            "source": "detnorske",
            "url": ticket_url,
            "description": "",
        })

    return events


def scrape() -> list[dict]:
    try:
        shows = _get_show_urls()
    except Exception:
        shows = []

    # Always include known shows as fallback
    known = [
        ("Pippi på sirkus", f"{BASE_URL}/framsyningar/pippi-pa-sirkus"),
        ("Palestinaprogrammet", f"{BASE_URL}/framsyningar/palestinaprogrammet"),
    ]
    existing_urls = {url for _, url in shows}
    for t, u in known:
        if u not in existing_urls:
            shows.append((t, u))

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
    print(f"Found {len(results)} events from Det Norske Teatret")
    for e in results[:5]:
        print(e)
