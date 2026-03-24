'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import auth from '@/lib/firebase/auth'
import db from '@/lib/firebase/firestore'
import { COLLECTIONS } from '@/lib/constants'
import { handleGoogleRedirectResult } from '@/services/auth.service'
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
