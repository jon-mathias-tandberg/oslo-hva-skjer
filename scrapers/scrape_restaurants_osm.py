"""
Fetches Oslo restaurants from OpenStreetMap via the Overpass API.
Uses Nominatim reverse geocoding to fill in missing street addresses.
Writes to data/restaurants_osm.json and frontend/public/data/restaurants_osm.json.

Run: python scrapers/scrape_restaurants_osm.py
"""
import json
import sys
import time
import requests
from pathlib import Path

OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.osm.ch/api/interpreter",
]
NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"

QUERY = """
[out:json][timeout:60];
node["amenity"="restaurant"](59.81,10.49,59.98,10.93);
out body;
"""

OUTPUT_PATHS = [
    Path(__file__).parent.parent / "data" / "restaurants_osm.json",
    Path(__file__).parent.parent / "frontend" / "public" / "data" / "restaurants_osm.json",
]

HEADERS = {"User-Agent": "oslo-hva-skjer/1.0 (github.com/jon-mathias-tandberg/oslo-hva-skjer)"}

CUISINE_NO = {
    "pizza": "Pizza", "burger": "Burger", "sushi": "Sushi", "asian": "Asiatisk",
    "thai": "Thai", "indian": "Indisk", "chinese": "Kinesisk", "japanese": "Japansk",
    "korean": "Koreansk", "vietnamese": "Vietnamesisk", "mexican": "Meksikansk",
    "italian": "Italiensk", "french": "Fransk", "american": "Amerikansk",
    "seafood": "Sjømat", "steak_house": "Steakhouse", "mediterranean": "Middelhavet",
    "middle_eastern": "Midtøsten", "greek": "Gresk", "spanish": "Spansk",
    "nordic": "Nordisk", "norwegian": "Norsk", "international": "Internasjonalt",
    "sandwich": "Sandwich", "kebab": "Kebab", "noodle": "Nudler",
}


def scrape() -> list[dict]:
    data = None
    for url in OVERPASS_URLS:
        try:
            res = requests.post(url, data={"data": QUERY}, timeout=65, headers=HEADERS)
            res.raise_for_status()
            data = res.json()
            break
        except Exception as e:
            print(f"  {url} failed: {e}", file=sys.stderr)
    if data is None:
        raise RuntimeError("All Overpass endpoints failed")

    restaurants = []
    for el in data.get("elements", []):
        tags = el.get("tags", {})
        name = tags.get("name", "").strip()
        if not name:
            continue

        cuisine_raw = tags.get("cuisine", "")
        cuisine = CUISINE_NO.get(cuisine_raw.split(";")[0].strip(), cuisine_raw.replace("_", " ").title()) if cuisine_raw else ""

        restaurant = {
            "id": f"osm-rest-{el['id']}",
            "name": name,
            "cuisine": cuisine,
            "address": _build_address(tags),
            "website": tags.get("website") or tags.get("contact:website") or "",
            "phone": _format_phone(tags.get("phone") or tags.get("contact:phone") or ""),
            "opening_hours": tags.get("opening_hours", ""),
            "description": tags.get("description", ""),
            "lat": el.get("lat"),
            "lon": el.get("lon"),
        }
        restaurants.append(restaurant)

    # Reverse geocode missing addresses
    missing = [r for r in restaurants if not r["address"] and r["lat"] and r["lon"]]
    print(f"  Fetching addresses for {len(missing)} restaurants via Nominatim...", file=sys.stderr)
    for restaurant in missing:
        try:
            r = requests.get(
                NOMINATIM_URL,
                params={"lat": restaurant["lat"], "lon": restaurant["lon"], "format": "json", "zoom": 18},
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
                restaurant["address"] = ", ".join(parts)
            time.sleep(1)
        except Exception:
            pass

    restaurants.sort(key=lambda r: r["name"].lower())
    return restaurants


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
    if not phone:
        return ""
    phone = phone.strip().replace(" ", "").replace("-", "")
    if phone.startswith("+47") and len(phone) == 11:
        digits = phone[3:]
        return f"+47 {digits[:2]} {digits[2:4]} {digits[4:6]} {digits[6:]}"
    return phone


if __name__ == "__main__":
    print("Fetching Oslo restaurants from OpenStreetMap...")
    restaurants = scrape()
    print(f"Found {len(restaurants)} restaurants")
    with_addr = sum(1 for r in restaurants if r.get("address"))
    with_phone = sum(1 for r in restaurants if r.get("phone"))
    print(f"  With address: {with_addr}, with phone: {with_phone}")

    for path in OUTPUT_PATHS:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(restaurants, ensure_ascii=False, indent=2))
        print(f"Written to {path}", file=sys.stderr)
