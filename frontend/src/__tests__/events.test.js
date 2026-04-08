import { describe, it, expect } from 'vitest'
import { filterByDate, filterByCategory, getEventsForDateRange } from '../utils/events'

const sampleEvents = [
  { id: '1', title: 'A', date: '2026-04-10', category: 'konsert', source: 'blaa', url: '#' },
  { id: '2', title: 'B', date: '2026-04-10', category: 'mat', source: 'vink', url: '#' },
  { id: '3', title: 'C', date: '2026-04-11', category: 'konsert', source: 'rockefeller', url: '#' },
  { id: '4', title: 'D', date: '2026-04-12', category: 'kultur', source: 'meetup', url: '#' },
]

describe('filterByDate', () => {
  it('returns events matching the given date', () => {
    const result = filterByDate(sampleEvents, '2026-04-10')
    expect(result).toHaveLength(2)
    expect(result.map(e => e.id)).toEqual(['1', '2'])
  })

  it('returns empty array when no events on date', () => {
    const result = filterByDate(sampleEvents, '2026-04-20')
    expect(result).toHaveLength(0)
  })
})

describe('filterByCategory', () => {
  it('returns all events when category is "alle"', () => {
    expect(filterByCategory(sampleEvents, 'alle')).toHaveLength(4)
  })

  it('filters events by category', () => {
    const result = filterByCategory(sampleEvents, 'konsert')
    expect(result).toHaveLength(2)
    expect(result.every(e => e.category === 'konsert')).toBe(true)
  })
})

describe('getEventsForDateRange', () => {
  it('returns events within date range inclusive', () => {
    const result = getEventsForDateRange(sampleEvents, '2026-04-10', '2026-04-11')
    expect(result).toHaveLength(3)
  })
})
