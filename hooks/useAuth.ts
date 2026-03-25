'use client'

import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'
import type { UserProfile } from '@/types'

interface AuthContextValue {
  user: User | null           // Firebase Auth user
  profile: UserProfile | null // Firestore profil
  loading: boolean            // kezdeti auth állapot betöltés
  profileLoading: boolean     // Firestore profil betöltés
}

// Context létrehozása — alapértelmezett értékek
export const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  profileLoading: false,
})

// Hook a context eléréshez
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

// Provider-t a components/auth/AuthProvider.tsx-ben hozzuk létre (Client Component)
