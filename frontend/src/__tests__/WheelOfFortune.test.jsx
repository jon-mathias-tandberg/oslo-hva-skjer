import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import WheelOfFortune from '../components/WheelOfFortune'

const events = [
  { id: '1', title: 'Konsert A', date: '2026-04-10', category: 'konsert', source: 'blaa', url: '#' },
  { id: '2', title: 'Restaurant B', date: '2026-04-10', category: 'mat', source: 'vink', url: '#' },
  { id: '3', title: 'Meetup C', date: '2026-04-11', category: 'kultur', source: 'meetup', url: '#' },
]

describe('WheelOfFortune', () => {
  it('renders spin button', () => {
    render(<WheelOfFortune events={events} />)
    expect(screen.getByRole('button', { name: /spin/i })).toBeInTheDocument()
  })

  it('shows a result after spinning', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    render(<WheelOfFortune events={events} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /spin/i }))
      await new Promise(r => setTimeout(r, 1600))
    })
    expect(screen.getByTestId('wheel-result')).toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it('shows empty state when no events', () => {
    render(<WheelOfFortune events={[]} />)
    expect(screen.getByText(/ingen events/i)).toBeInTheDocument()
  })
})
