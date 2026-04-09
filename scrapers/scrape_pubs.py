"""
Fetches Oslo pubs and bars from OpenStreetMap via the Overpass API.
Writes to data/pubs.json and frontend/public/data/pubs.json.

Run: python scrapers/scrape_pubs.py
"""
import json
import sys
import requests
from pathlib import Path

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Query for pubs and bars in Oslo municipality
QUERY = """
[out:json][timeout:30];
area["name"="Oslo"]["admin_level"="4"]->.oslo;
(
  node["amenity"="pub"](area.oslo);
  node["amenity"="bar"](area.oslo);
);
out body;
"""

OUTPUT_PATHS = [
    Path(__file__).parent.parent / "data" / "pubs.json",
    Path(__file__).parent.parent / "frontend" / "public" / "data" / "pubs.json",
]


def scrape() -> list[dict]:
    res = requests.post(OVERPASS_URL, data={"data": QUERY}, timeout=35)
    res.raise_for_status()
    data = res.json()

    pubs = []
    for el in data.get("elements", []):
        tags = el.get("tags", {})
        name = tags.get("name", "").strip()
        if not name:
            continue

        pub = {
            "id": f"osm-{el['id']}",
            "name": name,
            "type": tags.get("amenity", "bar"),
            "address": _build_address(tags),
            "website": tags.get("website") or tags.get("contact:website") or "",
            "phone": tags.get("phone") or tags.get("contact:phone") or "",
            "opening_hours": tags.get("opening_hours", ""),
            "description": tags.get("description", ""),
            "lat": el.get("lat"),
            "lon": el.get("lon"),
        }
        pubs.append(pub)

    pubs.sort(key=lambda p: p["name"].lower())
    return pubs


def _build_address(tags: dict) -> str:
    parts = []
    if tags.get("addr:street"):
        street = tags["addr:street"]
        if tags.get("addr:housenumber"):
            street += " " + tags["addr:housenumber"]
        parts.append(street)
    if tags.get("addr:postcode"):
        parts.append(tags["addr:postcode"])
    return ", ".join(parts)


if __name__ == "__main__":
    print("Fetching Oslo pubs from OpenStreetMap...")
    pubs = scrape()
    print(f"Found {len(pubs)} pubs/bars")

    for path in OUTPUT_PATHS:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(pubs, ensure_ascii=False, indent=2))
        print(f"Written to {path}", file=sys.stderr)
