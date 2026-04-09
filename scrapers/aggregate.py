"""
Aggregates all scrapers into data/events.json and frontend/public/data/events.json.
Run: python scrapers/aggregate.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import scrape_blaa
import scrape_rockefeller
import scrape_meetup
import scrape_vink
import scrape_nieuscene
import scrape_latter
import scrape_operaen
import scrape_oslonye
import scrape_detnorske
import scrape_folketeateret
import scrape_revolver_ticketco
import scrape_lasttrain

SCRAPERS = [
    scrape_blaa,
    scrape_rockefeller,
    scrape_meetup,
    scrape_vink,
    scrape_nieuscene,
    scrape_latter,
    scrape_operaen,
    scrape_oslonye,
    scrape_detnorske,
    scrape_folketeateret,
    scrape_revolver_ticketco,
    scrape_lasttrain,
]

OUTPUT_PATHS = [
    Path(__file__).parent.parent / "data" / "events.json",
    Path(__file__).parent.parent / "frontend" / "public" / "data" / "events.json",
]


def aggregate() -> list[dict]:
    all_events = []
    seen_ids = set()

    for scraper in SCRAPERS:
        name = scraper.__name__
        try:
            events = scraper.scrape()
            for e in events:
                if e["id"] not in seen_ids:
                    seen_ids.add(e["id"])
                    all_events.append(e)
            print(f"  {name}: {len(events)} events")
        except Exception as exc:
            print(f"  {name}: ERROR — {exc}", file=sys.stderr)

    all_events.sort(key=lambda e: (e["date"], e.get("time") or ""))
    return all_events


if __name__ == "__main__":
    print("Aggregating events...")
    events = aggregate()
    print(f"Total: {len(events)} events")

    for path in OUTPUT_PATHS:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(events, ensure_ascii=False, indent=2))
        print(f"Written to {path}")
