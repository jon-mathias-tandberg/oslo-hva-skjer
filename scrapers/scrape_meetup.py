"""
Fetches Oslo events from Meetup's public GraphQL API.
Returns a list of event dicts matching the events.json schema.

Endpoint: https://www.meetup.com/gql2  (POST)
  - The original /gql endpoint returns 404; the live endpoint is /gql2
  - radius must be Float, not Int

Verify by running: python scrape_meetup.py
"""
import re
import requests
from dateutil import parser as dateparser

API_URL = "https://www.meetup.com/gql2"

QUERY = """
query recommendedEvents($lat: Float!, $lon: Float!, $radius: Float!, $first: Int!) {
  recommendedEvents(filter: {lat: $lat, lon: $lon, radius: $radius}, first: $first) {
    edges {
      node {
        id
        title
        dateTime
        eventUrl
        description
        group { name }
      }
    }
  }
}
"""

HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "application/json",
    "Origin": "https://www.meetup.com",
    "Referer": "https://www.meetup.com/find/?location=no--Oslo&source=EVENTS",
}


def scrape() -> list[dict]:
    payload = {
        "operationName": "recommendedEvents",
        "query": QUERY,
        "variables": {"lat": 59.9139, "lon": 10.7522, "radius": 10.0, "first": 50},
    }
    res = requests.post(API_URL, json=payload, timeout=15, headers=HEADERS)
    res.raise_for_status()
    data = res.json()

    events = []
    edges = data.get("data", {}).get("recommendedEvents", {}).get("edges", [])
    for edge in edges:
        node = edge.get("node", {})
        try:
            parsed = dateparser.parse(node["dateTime"])
            title = node["title"]
            events.append({
                "id": f"meetup-{parsed.strftime('%Y-%m-%d')}-{re.sub(r'[^a-z0-9]', '-', title.lower())[:30]}",
                "title": title,
                "date": parsed.strftime("%Y-%m-%d"),
                "time": parsed.strftime("%H:%M"),
                "category": "kultur",
                "source": "meetup",
                "url": node["eventUrl"],
                "description": (node.get("description") or "")[:200],
            })
        except Exception:
            continue

    return events


if __name__ == "__main__":
    results = scrape()
    print(f"Found {len(results)} events from Meetup")
    for e in results[:3]:
        print(e)
