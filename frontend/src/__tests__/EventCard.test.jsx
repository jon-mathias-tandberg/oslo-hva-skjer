import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EventCard from '../components/EventCard'

const event = {
  id: '1',
  title: 'Aurora',
  date: '2026-04-12',
  time: '19:30',
  category: 'konsert',
  source: 'rockefeller',
  url: 'https://example.com',
  description: 'Konsert på Rockefeller',
}

describe('EventCard', () => {
  it('renders event title and time', () => {
    render(<EventCard event={event} />)
    expect(screen.getByText('Aurora')).toBeInTheDocument()
    expect(screen.getByText('19:30')).toBeInTheDocument()
  })

  it('renders source badge', () => {
    render(<EventCard event={event} />)
    expect(screen.getByText('rockefeller')).toBeInTheDocument()
  })

  it('renders external link', () => {
    render(<EventCard event={event} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('calls onToggleFavorite when star clicked (logged in)', () => {
    const onToggle = vi.fn()
    render(<EventCard event={event} isFavorite={false} onToggleFavorite={onToggle} isLoggedIn={true} />)
    fireEvent.click(screen.getByRole('button', { name: /lagre/i }))
    expect(onToggle).toHaveBeenCalledWith('1')
  })

  it('does not render favorite button when not logged in', () => {
    render(<EventCard event={event} isLoggedIn={false} />)
    expect(screen.queryByRole('button', { name: /lagre/i })).not.toBeInTheDocument()
  })
})
