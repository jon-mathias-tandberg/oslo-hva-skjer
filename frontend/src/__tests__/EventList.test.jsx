import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import EventList from '../components/EventList'

const events = [
  { id: '1', title: 'Konsert A', date: '2026-04-10', category: 'konsert', source: 'blaa', url: '#' },
  { id: '2', title: 'Restaurant B', date: '2026-04-10', category: 'mat', source: 'vink', url: '#' },
]

describe('EventList', () => {
  it('renders all events', () => {
    render(<EventList events={events} selectedDate="2026-04-10" isLoggedIn={false} favorites={[]} onToggleFavorite={() => {}} />)
    expect(screen.getByText('Konsert A')).toBeInTheDocument()
    expect(screen.getByText('Restaurant B')).toBeInTheDocument()
  })

  it('shows empty state when no events', () => {
    render(<EventList events={[]} selectedDate="2026-04-20" isLoggedIn={false} favorites={[]} onToggleFavorite={() => {}} />)
    expect(screen.getByText(/ingen aktiviteter/i)).toBeInTheDocument()
  })

  it('shows selected date in heading', () => {
    render(<EventList events={events} selectedDate="2026-04-10" isLoggedIn={false} favorites={[]} onToggleFavorite={() => {}} />)
    expect(screen.getByText(/10. april/i)).toBeInTheDocument()
  })
})
