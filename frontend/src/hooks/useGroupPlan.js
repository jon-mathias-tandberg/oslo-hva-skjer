import { useState, useEffect } from 'react'
import {
  collection, doc, setDoc, deleteDoc, updateDoc,
  onSnapshot, serverTimestamp, arrayUnion, arrayRemove
} from 'firebase/firestore'
import { db } from '../firebase'

export function useGroupPlan(groupId, uid) {
  const [plan, setPlan] = useState([])

  useEffect(() => {
    if (!groupId) { setPlan([]); return }

    const ref = collection(db, 'groups', groupId, 'plan')
    const unsubscribe = onSnapshot(ref, snap => {
      setPlan(snap.docs.map(d => ({ id: d.id, ...d.data() })))
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

  return { plan, addToPlan, removeFromPlan, toggleVote }
}
