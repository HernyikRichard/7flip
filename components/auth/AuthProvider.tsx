'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import auth from '@/lib/firebase/auth'
import db from '@/lib/firebase/firestore'
import { COLLECTIONS } from '@/lib/constants'
import { handleGoogleRedirectResult } from '@/services/auth.service'
import { AuthContext } from '@/hooks/useAuth'
import type { UserProfile } from '@/types'

// Ha a profil dokumentum nem létezik (pl. rules miatt nem jött létre regisztrációkor),
// automatikusan létrehozzuk az auth adatokból
async function ensureProfileExists(user: User): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, user.uid)
  await setDoc(
    userRef,
    {
      uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName ?? 'Névtelen',
      username: user.uid.slice(0, 12),
      photoURL: user.photoURL ?? null,
      gamesPlayed: 0,
      gamesWon: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true } // ne írja felül ha már részben létezik
  )
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    handleGoogleRedirectResult().catch(console.error)
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
      if (!firebaseUser) {
        setProfile(null)
      }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return

    setProfileLoading(true)
    const userRef = doc(db, COLLECTIONS.USERS, user.uid)

    const unsubscribe = onSnapshot(
      userRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          setProfile(snapshot.data() as UserProfile)
          setProfileLoading(false)
        } else {
          // Dokumentum nem létezik — létrehozzuk, az onSnapshot újra tüzel utána
          try {
            await ensureProfileExists(user)
            // Az onSnapshot automatikusan újra lefut a setDoc után
          } catch (err) {
            console.error('Profil létrehozás sikertelen:', err)
            setProfileLoading(false)
          }
        }
      },
      (error) => {
        console.error('Firestore profil hiba:', error)
        setProfileLoading(false)
      }
    )
    return () => unsubscribe()
  }, [user])

  return (
    <AuthContext.Provider value={{ user, profile, loading, profileLoading }}>
      {children}
    </AuthContext.Provider>
  )
}
