import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Calendar from '../components/Calendar'

const events = [
  { id: '1', date: '2026-04-10', category: 'konsert', title: 'A', source: 'blaa', url: '#' },
  { id: '2', date: '2026-04-15', category: 'mat', title: 'B', source: 'vink', url: '#' },
]

describe('Calendar', () => {
  it('renders days of selected month', () => {
    render(<Calendar events={events} selectedDate="2026-04-10" onSelectDate={() => {}} />)
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
  })

  it('calls onSelectDate when day is clicked', () => {
    const onSelect = vi.fn()
    render(<Calendar events={events} selectedDate="2026-04-10" onSelectDate={onSelect} />)
    fireEvent.click(screen.getByText('15'))
    expect(onSelect).toHaveBeenCalledWith('2026-04-15')
  })

  it('marks days with events with a dot indicator', () => {
    render(<Calendar events={events} selectedDate="2026-04-10" onSelectDate={() => {}} />)
    // Days with events have data-has-events attribute
    const day10 = screen.getByTestId('day-2026-04-10')
    expect(day10).toHaveAttribute('data-has-events', 'true')
  })
})
