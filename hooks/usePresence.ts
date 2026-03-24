'use client'

import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { setPresenceOnline, setPresenceOffline, subscribePresence } from '@/services/presence.service'

export function usePresence(gameId: string | null) {
  const { user } = useAuth()
  const [onlineUids, setOnlineUids] = useState<string[]>([])

  useEffect(() => {
    if (!gameId || !user) return

    setPresenceOnline(gameId, user.uid)
    const interval = setInterval(() => setPresenceOnline(gameId, user.uid), 30_000)
    const unsub = subscribePresence(gameId, setOnlineUids)

    return () => {
      clearInterval(interval)
      setPresenceOffline(gameId, user.uid)
      unsub()
    }
  }, [gameId, user])

  return { onlineUids }
}
