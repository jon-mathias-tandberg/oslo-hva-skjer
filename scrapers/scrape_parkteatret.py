"""
Scraper for Parkteatret (parkteatret.no/program).
Returns a list of event dicts matching the events.json schema.

HTML structure:
  article.event-card
    h2.event-card__heading > a          → title + event URL
    div.event-card__meta-column--date   → date "DD.MM.YY"
    div.event-details__row              → "Dørene åpner" / time
    a.box-button--orange                → Ticketmaster ticket link

Verify by running: python scrape_parkteatret.py
"""
import re
import requests
from bs4 import BeautifulSoup
from dateutil import parser as dateparser

BASE_URL = "https://www.parkteatret.no"
PROGRAM_URL = f"{BASE_URL}/program"


def scrape() -> list[dict]:
    res = requests.get(PROGRAM_URL, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
    res.raise_for_status()
    soup = BeautifulSoup(res.text, "html.parser")

    events = []
    for card in soup.select("article.event-card"):
        try:
            # Title and event page URL
            title_link = card.select_one("h2.event-card__heading a")
            if not title_link:
                continue
            title = title_link.get_text(strip=True)
            event_url = title_link.get("href", "")
            if not event_url.startswith("http"):
                event_url = BASE_URL + event_url

            # Date: "DD.MM.YY" in meta column
            date_el = card.select_one(".event-card__meta-column--date")
            if not date_el:
                continue
            raw_date = date_el.get_text(strip=True)  # e.g. "09.04.26"
            parsed = dateparser.parse(raw_date, dayfirst=True)
            if not parsed:
                continue

            # Time: look for "Dørene åpner" row
            time_val = None
            for row in card.select(".event-details__row"):
                cols = row.select(".event-details__column")
                if len(cols) == 2 and "dørene" in cols[0].get_text(strip=True).lower():
                    time_val = cols[1].get_text(strip=True)
                    break

            # Ticket link (Ticketmaster) — prefer over event page
            ticket_link = card.select_one("a.box-button--orange")
            url = ticket_link["href"] if ticket_link else event_url

            # Skip cancelled events
            card_text = card.get_text(" ", strip=True).lower()
            if "avlyst" in card_text:
                continue

            events.append({
                "id": f"parkteatret-{parsed.strftime('%Y-%m-%d')}-{re.sub(r'[^a-z0-9]', '-', title.lower())[:30]}",
                "title": title,
                "date": parsed.strftime("%Y-%m-%d"),
                "time": time_val,
                "category": "konsert",
                "source": "parkteatret",
                "url": url,
                "description": "",
            })
        except Exception:
            continue

    return events


if __name__ == "__main__":
    results = scrape()
    print(f"Found {len(results)} events from Parkteatret")
    for e in results[:3]:
        print(e)
