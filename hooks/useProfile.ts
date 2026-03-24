'use client'

import { useState, useCallback } from 'react'
import { useAuth } from './useAuth'
import { updateUserProfile, isUsernameAvailable } from '@/services/user.service'
import type { UpdateUserProfileData } from '@/types'

interface UseProfileReturn {
  saving: boolean
  error: string | null
  success: boolean
  saveProfile: (data: UpdateUserProfileData) => Promise<boolean>
  checkUsername: (username: string) => Promise<boolean>
  clearStatus: () => void
}

export function useProfile(): UseProfileReturn {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const clearStatus = useCallback(() => {
    setError(null)
    setSuccess(false)
  }, [])

  const checkUsername = useCallback(
    async (username: string): Promise<boolean> => {
      if (!user) return false
      return isUsernameAvailable(username, user.uid)
    },
    [user]
  )

  const saveProfile = useCallback(
    async (data: UpdateUserProfileData): Promise<boolean> => {
      if (!user) return false
      setSaving(true)
      setError(null)
      setSuccess(false)

      try {
        await updateUserProfile(user.uid, data)
        setSuccess(true)
        return true
      } catch (err) {
        if (err instanceof Error && err.message === 'USERNAME_TAKEN') {
          setError('Ez a felhasználónév már foglalt.')
        } else {
          setError('Nem sikerült menteni. Próbáld újra.')
        }
        return false
      } finally {
        setSaving(false)
      }
    },
    [user]
  )

  return { saving, error, success, saveProfile, checkUsername, clearStatus }
}
