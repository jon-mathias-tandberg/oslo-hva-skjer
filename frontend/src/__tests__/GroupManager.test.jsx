import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import GroupManager from '../components/GroupManager'

const createGroup = vi.fn().mockResolvedValue('new-group-id')
const joinGroup = vi.fn().mockResolvedValue('existing-group-id')

describe('GroupManager', () => {
  it('renders create group form', () => {
    render(<GroupManager uid="uid-1" groups={[]} createGroup={createGroup} joinGroup={joinGroup} onSelectGroup={() => {}} />)
    expect(screen.getByPlaceholderText(/gruppenavn/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /opprett/i })).toBeInTheDocument()
  })

  it('renders join group form', () => {
    render(<GroupManager uid="uid-1" groups={[]} createGroup={createGroup} joinGroup={joinGroup} onSelectGroup={() => {}} />)
    expect(screen.getByPlaceholderText(/invitasjonskode/i)).toBeInTheDocument()
  })

  it('calls createGroup and onSelectGroup when form submitted', async () => {
    const onSelect = vi.fn()
    render(<GroupManager uid="uid-1" groups={[]} createGroup={createGroup} joinGroup={joinGroup} onSelectGroup={onSelect} />)
    fireEvent.change(screen.getByPlaceholderText(/gruppenavn/i), { target: { value: 'Fredagsklubben' } })
    fireEvent.click(screen.getByRole('button', { name: /opprett/i }))
    await waitFor(() => {
      expect(createGroup).toHaveBeenCalledWith('Fredagsklubben')
      expect(onSelect).toHaveBeenCalledWith('new-group-id')
    })
  })
})
