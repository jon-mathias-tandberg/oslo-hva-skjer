import { useState, useEffect } from 'react'
import {
  collection, doc, setDoc, updateDoc, getDocs,
  onSnapshot, query, where, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'

function generateInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export function useGroup(uid) {
  const [groups, setGroups] = useState([])

  useEffect(() => {
    if (!uid) { setGroups([]); return }

    // Listen to all groups where user is a member
    const ref = collection(db, 'groups')
    const q = query(ref, where(`members.${uid}`, '!=', null))
    const unsubscribe = onSnapshot(q, snap => {
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsubscribe
  }, [uid])

  async function createGroup(name) {
    if (!uid || !name.trim()) return null
    const groupRef = doc(collection(db, 'groups'))
    const inviteCode = generateInviteCode()
    try {
      await setDoc(groupRef, {
        name: name.trim(),
        inviteCode,
        createdBy: uid,
        members: { [uid]: { joinedAt: serverTimestamp() } },
        createdAt: serverTimestamp(),
      })
      return groupRef.id
    } catch {
      return null
    }
  }

  async function joinGroup(inviteCode) {
    if (!uid || !inviteCode) return false
    try {
      const ref = collection(db, 'groups')
      const q = query(ref, where('inviteCode', '==', inviteCode.toUpperCase()))
      const snap = await getDocs(q)
      if (!snap.docs.length) return false
      const groupDoc = snap.docs[0]
      await updateDoc(groupDoc.ref, {
        [`members.${uid}`]: { joinedAt: serverTimestamp() },
      })
      return groupDoc.id
    } catch {
      return false
    }
  }

  return { groups, createGroup, joinGroup }
}
