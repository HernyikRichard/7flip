'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from './useAuth'
import {
  setPresenceOnline,
  setPresenceOffline,
  subscribeGamePresence,
} from '@/services/presence.service'
import type { GamePresenceEntry } from '@/services/presence.service'

interface PresenceOptions {
  displayName?: string
  photoURL?: string | null
  role?: 'player' | 'spectator'
  currentView?: string
}

export function usePresence(gameId: string | null, options?: PresenceOptions) {
  const { user } = useAuth()
  // Ref so the effect closure always sees latest options without re-mounting.
  // Updated in a layout-like effect (after every render, before next interval tick).
  const optionsRef = useRef<PresenceOptions | undefined>(options)
  useEffect(() => { optionsRef.current = options })

  const [entries, setEntries] = useState<GamePresenceEntry[]>([])

  useEffect(() => {
    if (!gameId || !user) return

    const getExtra = (): PresenceOptions => ({
      displayName: optionsRef.current?.displayName ?? undefined,
      photoURL: optionsRef.current?.photoURL ?? null,
      role: optionsRef.current?.role ?? 'player',
      currentView: optionsRef.current?.currentView ?? 'game',
    })

    setPresenceOnline(gameId, user.uid, getExtra())
    const interval = setInterval(
      () => setPresenceOnline(gameId, user.uid, getExtra()),
      30_000
    )
    const unsub = subscribeGamePresence(gameId, setEntries)

    return () => {
      clearInterval(interval)
      setPresenceOffline(gameId, user.uid)
      unsub()
    }
  }, [gameId, user])

  const onlineUids = entries.map((e) => e.uid)
  const spectatorEntries = entries.filter((e) => e.role === 'spectator')
  const playerEntries = entries.filter((e) => e.role !== 'spectator')

  return { onlineUids, presenceEntries: entries, spectatorEntries, playerEntries }
}
