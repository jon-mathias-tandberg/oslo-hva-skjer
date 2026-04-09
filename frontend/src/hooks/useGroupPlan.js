import { useState, useEffect } from 'react'
import {
  collection, doc, setDoc, deleteDoc, updateDoc,
  onSnapshot, serverTimestamp, arrayUnion, arrayRemove
} from 'firebase/firestore'
import { db } from '../firebase'

export function useGroupPlan(groupId, uid) {
  const [plan, setPlan] = useState([])
  const [lastAdded, setLastAdded] = useState(null)

  useEffect(() => {
    if (!groupId) { setPlan([]); return }

    const ref = collection(db, 'groups', groupId, 'plan')
    const unsubscribe = onSnapshot(ref, snap => {
      const newPlan = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setPlan(prev => {
        if (prev.length > 0 && newPlan.length > prev.length) {
          const added = newPlan.find(p => !prev.some(pp => pp.id === p.id))
          if (added) setLastAdded(added)
        }
        return newPlan
      })
    })
    return unsubscribe
  }, [groupId])

  async function addToPlan(eventId) {
    if (!groupId || !uid) return
    const ref = doc(db, 'groups', groupId, 'plan', eventId)
    try {
      await setDoc(ref, {
        eventId,
        addedBy: uid,
        addedAt: serverTimestamp(),
        votes: [],
      })
    } catch {
      // ignore — Firestore offline or permission error
    }
  }

  async function removeFromPlan(eventId) {
    if (!groupId || !uid) return
    const ref = doc(db, 'groups', groupId, 'plan', eventId)
    try {
      await deleteDoc(ref)
    } catch {
      // ignore
    }
  }

  async function toggleVote(eventId, hasVoted) {
    if (!groupId || !uid) return
    const ref = doc(db, 'groups', groupId, 'plan', eventId)
    try {
      await updateDoc(ref, {
        votes: hasVoted ? arrayRemove(uid) : arrayUnion(uid),
      })
    } catch {
      // ignore
    }
  }

  function clearLastAdded() {
    setLastAdded(null)
  }

  return { plan, addToPlan, removeFromPlan, toggleVote, lastAdded, clearLastAdded }
}
