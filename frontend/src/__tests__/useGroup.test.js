import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(() => ({ id: 'group-abc' })),
  setDoc: vi.fn().mockResolvedValue(undefined),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  onSnapshot: vi.fn((_, cb) => { cb({ docs: [] }); return () => {} }),
  query: vi.fn(),
  where: vi.fn(),
  serverTimestamp: vi.fn(() => 'ts'),
  arrayUnion: vi.fn(v => v),
}))

import { useGroup } from '../hooks/useGroup'

describe('useGroup', () => {
  it('returns empty groups when uid is null', () => {
    const { result } = renderHook(() => useGroup(null))
    expect(result.current.groups).toEqual([])
  })

  it('createGroup calls setDoc and returns { id }', async () => {
    const { setDoc } = await import('firebase/firestore')
    const { result } = renderHook(() => useGroup('uid-1'))
    let res
    await act(async () => {
      res = await result.current.createGroup('Fredagsklubben')
    })
    expect(setDoc).toHaveBeenCalled()
    expect(res?.id).toBeDefined()
  })

  it('joinGroup returns { notFound: true } when invite code not found', async () => {
    const { result } = renderHook(() => useGroup('uid-1'))
    let res
    await act(async () => {
      res = await result.current.joinGroup('BADCODE')
    })
    expect(res?.notFound).toBe(true)
  })
})
