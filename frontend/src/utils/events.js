/**
 * Filter events to those occurring on a specific date (YYYY-MM-DD).
 */
export function filterByDate(events, date) {
  return events.filter(e => e.date === date)
}

/**
 * Filter events by category. Pass 'alle' to return all events.
 */
export function filterByCategory(events, category) {
  if (category === 'alle') return events
  return events.filter(e => e.category === category)
}

/**
 * Return events within [fromDate, toDate] inclusive.
 * Both dates must be in YYYY-MM-DD format (ISO 8601).
 */
export function getEventsForDateRange(events, fromDate, toDate) {
  return events.filter(e => e.date >= fromDate && e.date <= toDate)
}

/**
 * Fetch and parse events.json. Path is relative to public root.
 */
export async function loadEvents() {
  const res = await fetch('/data/events.json')
  if (!res.ok) throw new Error(`Failed to load events: ${res.status}`)
  return res.json()
}
