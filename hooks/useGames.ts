'use client'

import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { subscribeUserGames } from '@/services/game.service'
import type { Game } from '@/types'

interface UseGamesReturn {
  games: Game[]
  activeGames: Game[]
  finishedGames: Game[]
  loading: boolean
}

export function useGames(): UseGamesReturn {
  const { user } = useAuth()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const unsub = subscribeUserGames(user.uid, (data) => {
      setGames(data)
      setLoading(false)
    })
    return () => unsub()
  }, [user])

  const activeStatuses: Game['status'][] = ['waiting_for_players', 'in_round', 'awaiting_action', 'round_finished']

  return {
    games,
    activeGames: games.filter((g) => activeStatuses.includes(g.status)),
    finishedGames: games.filter((g) => g.status === 'game_finished'),
    loading,
  }
}
