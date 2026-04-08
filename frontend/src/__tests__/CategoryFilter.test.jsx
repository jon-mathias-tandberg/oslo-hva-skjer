import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CategoryFilter from '../components/CategoryFilter'

describe('CategoryFilter', () => {
  it('renders all category buttons', () => {
    render(<CategoryFilter selected="alle" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /alle/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /konsert/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mat/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /kultur/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /humor/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /annet/i })).toBeInTheDocument()
  })

  it('marks selected category as active', () => {
    render(<CategoryFilter selected="konsert" onChange={() => {}} />)
    const btn = screen.getByRole('button', { name: /konsert/i })
    expect(btn).toHaveClass('bg-blue-600')
  })

  it('calls onChange with category when clicked', () => {
    const onChange = vi.fn()
    render(<CategoryFilter selected="alle" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /mat/i }))
    expect(onChange).toHaveBeenCalledWith('mat')
  })
})
