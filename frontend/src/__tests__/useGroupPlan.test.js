import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  onSnapshot: vi.fn((_, cb) => { cb({ docs: [] }); return () => {} }),
  serverTimestamp: vi.fn(() => 'ts'),
  arrayUnion: vi.fn(v => v),
  arrayRemove: vi.fn(v => v),
}))

import { useGroupPlan } from '../hooks/useGroupPlan'

describe('useGroupPlan', () => {
  it('returns empty plan when groupId is null', () => {
    const { result } = renderHook(() => useGroupPlan(null, 'uid-1'))
    expect(result.current.plan).toEqual([])
  })

  it('addToPlan calls setDoc', async () => {
    const { setDoc } = await import('firebase/firestore')
    const { result } = renderHook(() => useGroupPlan('group-1', 'uid-1'))
    await act(async () => {
      await result.current.addToPlan('event-42')
    })
    expect(setDoc).toHaveBeenCalled()
  })

  it('toggleVote calls updateDoc', async () => {
    const { updateDoc } = await import('firebase/firestore')
    const { result } = renderHook(() => useGroupPlan('group-1', 'uid-1'))
    await act(async () => {
      await result.current.toggleVote('event-42', false)
    })
    expect(updateDoc).toHaveBeenCalled()
  })
})
