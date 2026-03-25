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

async function ensureProfileExists(user: User): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, user.uid)
  await setDoc(
    userRef,
    {
      uid:         user.uid,
      email:       user.email ?? '',
      displayName: user.displayName ?? 'Névtelen',
      username:    user.uid.slice(0, 12),
      photoURL:    user.photoURL ?? null,
      gamesPlayed: 0,
      gamesWon:    0,
      createdAt:   serverTimestamp(),
      updatedAt:   serverTimestamp(),
    },
    { merge: true }
  )
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]                 = useState<User | null>(null)
  const [profile, setProfile]           = useState<UserProfile | null>(null)
  const [loading, setLoading]           = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  // ── Auth inicializálás ─────────────────────────────────────────────────────
  // KRITIKUS SORREND:
  //   1. handleGoogleRedirectResult() — awaitelni KELL, mielőtt az auth listener
  //      feliratkozik. Ha nem, az onAuthStateChanged null-lal tüzel redirect
  //      visszatéréskor (a token csere még folyamatban), az AppLayout loginra dob,
  //      majd mire a redirect result feldolgozódna, már nincs hova visszatérni.
  //   2. onAuthStateChanged feliratkozás — csak a redirect result után.
  useEffect(() => {
    let unsubAuth: (() => void) | null = null
    let cancelled = false

    async function init() {
      // 1. Redirect visszatérés kezelése (Google redirect flow)
      try {
        await handleGoogleRedirectResult()
      } catch (err) {
        // Redirect result hibák nem kritikusak — lehet, hogy nem volt redirect
        console.error('[Auth] redirect result hiba:', err)
      }

      if (cancelled) return

      // 2. Auth state listener — csak a redirect result feldolgozása után
      unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser)
        setLoading(false)
        if (!firebaseUser) {
          setProfile(null)
        }
      })
    }

    init()

    return () => {
      cancelled = true
      unsubAuth?.()
    }
  }, [])

  // ── Firestore profil figyelés ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) return

    setProfileLoading(true)
    const userRef = doc(db, COLLECTIONS.USERS, user.uid)

    const unsubProfile = onSnapshot(
      userRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          setProfile(snapshot.data() as UserProfile)
          setProfileLoading(false)
        } else {
          // Dokumentum nem létezik — létrehozzuk, onSnapshot újra tüzel
          try {
            await ensureProfileExists(user)
          } catch (err) {
            console.error('[Auth] profil létrehozás sikertelen:', err)
            setProfileLoading(false)
          }
        }
      },
      (error) => {
        console.error('[Auth] Firestore profil hiba:', error)
        setProfileLoading(false)
      }
    )

    return () => unsubProfile()
  }, [user])

  return (
    <AuthContext.Provider value={{ user, profile, loading, profileLoading }}>
      {children}
    </AuthContext.Provider>
  )
}
