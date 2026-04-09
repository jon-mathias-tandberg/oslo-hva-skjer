import { useState, useEffect } from 'react'
import {
  collection, doc, setDoc, updateDoc, getDocs,
  onSnapshot, query, where, serverTimestamp, arrayUnion
} from 'firebase/firestore'
import { db, auth } from '../firebase'

function generateInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export function useGroup(uid) {
  const [groups, setGroups] = useState([])

  useEffect(() => {
    if (!uid) { setGroups([]); return }

    // Use array-contains on memberIds for reliable querying without composite index
    const ref = collection(db, 'groups')
    const q = query(ref, where('memberIds', 'array-contains', uid))
    const unsubscribe = onSnapshot(q, snap => {
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }, err => {
      console.error('useGroup onSnapshot error:', err)
    })
    return unsubscribe
  }, [uid])

  async function createGroup(name) {
    if (!uid || !name.trim()) return { error: 'Mangler navn eller bruker' }
    // Force token refresh so Firestore gets a valid auth token
    try { await auth.currentUser?.getIdToken(true) } catch (_) {}
    const groupRef = doc(collection(db, 'groups'))
    const inviteCode = generateInviteCode()
    try {
      await setDoc(groupRef, {
        name: name.trim(),
        inviteCode,
        createdBy: uid,
        memberIds: [uid],
        members: { [uid]: { joinedAt: serverTimestamp() } },
        createdAt: serverTimestamp(),
      })
      return { id: groupRef.id }
    } catch (err) {
      console.error('createGroup error:', err)
      return { error: err.message ?? 'Kunne ikke opprette gruppe' }
    }
  }

  async function joinGroup(inviteCode) {
    if (!uid || !inviteCode) return { error: 'Mangler kode eller bruker' }
    try {
      const ref = collection(db, 'groups')
      const q = query(ref, where('inviteCode', '==', inviteCode.toUpperCase()))
      const snap = await getDocs(q)
      if (!snap.docs.length) return { notFound: true }
      const groupDoc = snap.docs[0]
      await updateDoc(groupDoc.ref, {
        memberIds: arrayUnion(uid),
        [`members.${uid}`]: { joinedAt: serverTimestamp() },
      })
      return { id: groupDoc.id }
    } catch (err) {
      console.error('joinGroup error:', err)
      return { error: err.message ?? 'Kunne ikke bli med i gruppe' }
    }
  }

  return { groups, createGroup, joinGroup }
}
