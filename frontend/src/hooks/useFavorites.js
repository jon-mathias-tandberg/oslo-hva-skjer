import { useState, useEffect } from 'react'
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

export function useFavorites(uid) {
  const [favorites, setFavorites] = useState([])

  useEffect(() => {
    if (!uid) { setFavorites([]); return }

    const ref = collection(db, 'users', uid, 'favorites')
    const unsubscribe = onSnapshot(ref, snap => {
      setFavorites(snap.docs.map(d => d.id))
    })
    return unsubscribe
  }, [uid])

  async function toggleFavorite(eventId) {
    if (!uid) return
    const ref = doc(db, 'users', uid, 'favorites', eventId)
    if (favorites.includes(eventId)) {
      await deleteDoc(ref)
    } else {
      await setDoc(ref, { savedAt: serverTimestamp() })
    }
  }

  return { favorites, toggleFavorite }
}
