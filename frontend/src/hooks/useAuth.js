import { useState, useEffect } from 'react'
import { onIdTokenChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from '../firebase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // onIdTokenChanged fires after the token is ready (vs onAuthStateChanged
    // which can fire before Firestore has received the auth token)
    const unsubscribe = onIdTokenChanged(auth, async u => {
      if (u) await u.getIdToken().catch(() => {})
      setUser(u)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function signInWithGoogle() {
    setError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      setError(err.message)
    }
  }

  async function logout() {
    setError(null)
    try {
      await signOut(auth)
    } catch (err) {
      setError(err.message)
    }
  }

  return { user, loading, error, signInWithGoogle, logout }
}
