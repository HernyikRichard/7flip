'use client'

import { useEffect, useState } from 'react'
import { getGame, getGameRounds } from '@/services/game.service'
import type { Game, Round } from '@/types'

interface UseGameHistoryReturn {
  game: Game | null
  rounds: Round[]
  loading: boolean
}

export function useGameHistory(gameId: string): UseGameHistoryReturn {
  const [game, setGame] = useState<Game | null>(null)
  const [rounds, setRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [g, r] = await Promise.all([getGame(gameId), getGameRounds(gameId)])
      setGame(g)
      setRounds(r)
      setLoading(false)
    }
    load()
  }, [gameId])

  return { game, rounds, loading }
}
