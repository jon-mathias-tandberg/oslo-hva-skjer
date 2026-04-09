"""
Fetches Oslo pubs and bars from OpenStreetMap via the Overpass API.
Uses Nominatim reverse geocoding to fill in missing street addresses.
Writes to data/pubs.json and frontend/public/data/pubs.json.

Run: python scrapers/scrape_pubs.py
"""
import json
import sys
import time
import requests
from pathlib import Path

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"

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

HEADERS = {"User-Agent": "oslo-hva-skjer/1.0 (github.com/jon-mathias-tandberg/oslo-hva-skjer)"}


def scrape() -> list[dict]:
    res = requests.post(OVERPASS_URL, data={"data": QUERY}, timeout=35, headers=HEADERS)
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
            "phone": _format_phone(tags.get("phone") or tags.get("contact:phone") or ""),
            "opening_hours": tags.get("opening_hours", ""),
            "description": tags.get("description", ""),
            "lat": el.get("lat"),
            "lon": el.get("lon"),
        }
        pubs.append(pub)

    # Reverse geocode missing addresses (rate-limited to 1 req/s per Nominatim policy)
    missing = [p for p in pubs if not p["address"] and p["lat"] and p["lon"]]
    print(f"  Fetching addresses for {len(missing)} pubs via Nominatim...", file=sys.stderr)
    for pub in missing:
        try:
            r = requests.get(
                NOMINATIM_URL,
                params={"lat": pub["lat"], "lon": pub["lon"], "format": "json", "zoom": 18},
                headers=HEADERS,
                timeout=10,
            )
            if r.ok:
                addr = r.json().get("address", {})
                parts = []
                if addr.get("road"):
                    road = addr["road"]
                    if addr.get("house_number"):
                        road += " " + addr["house_number"]
                    parts.append(road)
                if addr.get("postcode"):
                    parts.append(addr["postcode"])
                pub["address"] = ", ".join(parts)
            time.sleep(1)  # Nominatim rate limit: max 1 req/s
        except Exception:
            pass

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


def _format_phone(phone: str) -> str:
    """Normalize Norwegian phone numbers to +47 XXXXXXXX format."""
    if not phone:
        return ""
    phone = phone.strip().replace(" ", "").replace("-", "")
    if phone.startswith("+47") and len(phone) == 11:
        digits = phone[3:]
        return f"+47 {digits[:2]} {digits[2:4]} {digits[4:6]} {digits[6:]}"
    return phone


if __name__ == "__main__":
    print("Fetching Oslo pubs from OpenStreetMap...")
    pubs = scrape()
    print(f"Found {len(pubs)} pubs/bars")
    with_addr = sum(1 for p in pubs if p.get("address"))
    with_phone = sum(1 for p in pubs if p.get("phone"))
    print(f"  With address: {with_addr}, with phone: {with_phone}")

    for path in OUTPUT_PATHS:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(pubs, ensure_ascii=False, indent=2))
        print(f"Written to {path}", file=sys.stderr)
