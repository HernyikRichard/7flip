'use client'

import { useEffect, useState } from 'react'
import { subscribeGame } from '@/services/game.service'
import { subscribeLatestRound } from '@/services/round.service'
import type { Game, Round } from '@/types'

interface UseGameDetailReturn {
  game: Game | null
  currentRound: Round | null
  loading: boolean
}

export function useGameDetail(gameId: string): UseGameDetailReturn {
  const [game, setGame]               = useState<Game | null>(null)
  const [currentRound, setCurrentRound] = useState<Round | null>(null)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    if (!gameId) return
    let gameLoaded = false
    let roundLoaded = false
    const checkDone = () => { if (gameLoaded && roundLoaded) setLoading(false) }

    const unsubGame = subscribeGame(gameId, (data) => {
      setGame(data)
      gameLoaded = true
      checkDone()
    })
    const unsubRound = subscribeLatestRound(gameId, (data) => {
      setCurrentRound(data)
      roundLoaded = true
      checkDone()
    })

    return () => { unsubGame(); unsubRound() }
  }, [gameId])

  return { game, currentRound, loading }
}
