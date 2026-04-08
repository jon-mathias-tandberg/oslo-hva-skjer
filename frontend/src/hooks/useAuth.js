import { useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from '../firebase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, u => {
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
