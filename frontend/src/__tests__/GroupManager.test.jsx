import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import GroupManager from '../components/GroupManager'

const mockUseGroup = {
  groups: [],
  createGroup: vi.fn().mockResolvedValue('new-group-id'),
  joinGroup: vi.fn().mockResolvedValue('existing-group-id'),
}

vi.mock('../hooks/useGroup', () => ({
  useGroup: () => mockUseGroup,
}))

describe('GroupManager', () => {
  it('renders create group form', () => {
    render(<GroupManager uid="uid-1" onSelectGroup={() => {}} />)
    expect(screen.getByPlaceholderText(/gruppenavn/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /opprett/i })).toBeInTheDocument()
  })

  it('renders join group form', () => {
    render(<GroupManager uid="uid-1" onSelectGroup={() => {}} />)
    expect(screen.getByPlaceholderText(/invitasjonskode/i)).toBeInTheDocument()
  })

  it('calls createGroup and onSelectGroup when form submitted', async () => {
    const onSelect = vi.fn()
    render(<GroupManager uid="uid-1" onSelectGroup={onSelect} />)
    fireEvent.change(screen.getByPlaceholderText(/gruppenavn/i), { target: { value: 'Fredagsklubben' } })
    fireEvent.click(screen.getByRole('button', { name: /opprett/i }))
    await waitFor(() => {
      expect(mockUseGroup.createGroup).toHaveBeenCalledWith('Fredagsklubben')
      expect(onSelect).toHaveBeenCalledWith('new-group-id')
    })
  })
})
