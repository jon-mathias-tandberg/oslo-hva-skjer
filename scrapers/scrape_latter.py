"""
Scraper for Latter (latter.no) - Oslo comedy club.
Returns a list of event dicts matching the events.json schema.

The site uses a Vue.js frontend backed by two JSON API endpoints:

1. Shows list:
   GET /actions/shows-module/default/shows?dateFrom=DATE&dateTo=DATE&showId=&locationId=2650
   Returns: { performances: { "26": { "April": { "9": [{...}] } } } }
   Nested as: 2-digit year → Norwegian month name → day number → list of performance objects

2. Individual show performances:
   GET /actions/shows-module/default/shows?dateFrom=DATE&dateTo=DATE&showId=ID&locationId=2650
   Returns the same structure but filtered to one show.

Strategy: fetch the full shows list (month→day→performance objects). Each performance object
already contains parentTitle, time, urlParentNew, urlTicket, and the date is derived from
the month/day keys in the nested structure.

locationId 2650 = Latter i Oslo (main venue)

Verify by running: python scrape_latter.py
"""
import re
import requests
from datetime import date, timedelta

BASE_URL = "https://www.latter.no"
LOCATION_ID = 2650

MONTH_NO = {
    "januar": 1, "februar": 2, "mars": 3, "april": 4,
    "mai": 5, "juni": 6, "juli": 7, "august": 8,
    "september": 9, "oktober": 10, "november": 11, "desember": 12,
}


def _fetch_performances(date_from: str, date_to: str) -> list[dict]:
    """Fetch all performances for a date range from the Latter API."""
    url = (
        f"{BASE_URL}/actions/shows-module/default/shows"
        f"?dateFrom={date_from}&dateTo={date_to}&showId=&locationId={LOCATION_ID}"
    )
    res = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
    res.raise_for_status()
    data = res.json()

    performances = []
    raw = data.get("performances", {})

    # The API returns a nested dict: year (2-digit str) → month (Norwegian name) → day (str) → [performances]
    for year_str, months in raw.items():
        try:
            year = 2000 + int(year_str)
        except (ValueError, TypeError):
            continue
        if not isinstance(months, dict):
            continue
        for month_name, days in months.items():
            month_num = MONTH_NO.get(month_name.lower())
            if month_num is None:
                continue
            if not isinstance(days, dict):
                continue
            for day_str, perf_list in days.items():
                try:
                    day_num = int(day_str)
                except ValueError:
                    continue
                if not isinstance(perf_list, list):
                    continue
                for perf in perf_list:
                    perf["_year"] = year
                    perf["_month"] = month_num
                    perf["_day"] = day_num
                    performances.append(perf)

    return performances


def scrape() -> list[dict]:
    today = date.today()
    date_from = today.isoformat()
    date_to = (today + timedelta(days=365)).isoformat()

    try:
        raw_perfs = _fetch_performances(date_from, date_to)
    except Exception:
        return []

    events = []
    for perf in raw_perfs:
        try:
            year = perf["_year"]
            month = perf["_month"]
            day = perf["_day"]
            event_date = date(year, month, day)

            title = (perf.get("parentTitle") or "").strip()
            if not title:
                title = (perf.get("title") or "").strip()
            if not title:
                continue

            time_str = perf.get("time") or None

            # Prefer the ticket URL; fall back to show page
            url = perf.get("urlTicket") or perf.get("urlParentNew") or perf.get("urlParent") or BASE_URL
            if not url or "ticketmaster.no/search" in url:
                url = perf.get("urlParentNew") or perf.get("urlParent") or BASE_URL

            subtitle = (perf.get("parentSubtitle") or "").strip()
            description = subtitle[:200] if subtitle else ""

            slug = re.sub(r"[^a-z0-9]", "-", title.lower())[:30].strip("-")
            event_id = f"latter-{event_date.isoformat()}-{slug}"
            if time_str:
                event_id += f"-{time_str.replace(':', '')}"

            events.append({
                "id": event_id,
                "title": title,
                "date": event_date.isoformat(),
                "time": time_str,
                "category": "humor",
                "source": "latter",
                "url": url,
                "description": description,
            })
        except Exception:
            continue

    # Deduplicate by id
    seen = set()
    unique = []
    for e in events:
        if e["id"] not in seen:
            seen.add(e["id"])
            unique.append(e)

    unique.sort(key=lambda e: (e["date"], e.get("time") or ""))
    return unique


if __name__ == "__main__":
    results = scrape()
    print(f"Found {len(results)} events from Latter")
    for e in results[:5]:
        print(e)
