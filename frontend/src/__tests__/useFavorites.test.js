import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock Firebase
vi.mock('../firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  onSnapshot: vi.fn((_, cb) => { cb({ docs: [] }); return () => {} }),
  doc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  serverTimestamp: vi.fn(() => 'ts'),
}))

import { useFavorites } from '../hooks/useFavorites'

describe('useFavorites', () => {
  it('returns empty favorites when not logged in', () => {
    const { result } = renderHook(() => useFavorites(null))
    expect(result.current.favorites).toEqual([])
  })

  it('toggleFavorite adds new favorite', async () => {
    const { setDoc } = await import('firebase/firestore')
    const { result } = renderHook(() => useFavorites('uid-123'))
    await act(async () => {
      await result.current.toggleFavorite('event-1')
    })
    expect(setDoc).toHaveBeenCalled()
  })

  it('toggleFavorite removes existing favorite', async () => {
    const { deleteDoc, onSnapshot } = await import('firebase/firestore')
    onSnapshot.mockImplementationOnce((_, cb) => {
      cb({ docs: [{ id: 'event-1' }] })
      return () => {}
    })
    const { result } = renderHook(() => useFavorites('uid-123'))
    await act(async () => {
      await result.current.toggleFavorite('event-1')
    })
    expect(deleteDoc).toHaveBeenCalled()
  })
})
