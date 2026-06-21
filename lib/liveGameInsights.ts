import type { Game, Round } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type LiveInsightType =
  | 'leader'
  | 'close_game'
  | 'flip7_watch'
  | 'hot_round'
  | 'brutal_warning'
  | 'bust_streak'

export type InsightTone = 'neutral' | 'positive' | 'warning' | 'spicy'

export interface LiveGameInsight {
  type: LiveInsightType
  playerUid?: string
  title: string
  message: string
  tone: InsightTone
  value?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FUNCTION — pure, Firebase-free
// ─────────────────────────────────────────────────────────────────────────────

export function computeLiveInsights(
  game: Game,
  currentRound: Round | null,
): LiveGameInsight[] {
  const { players, roundCount, gameMode } = game
  if (players.length < 2) return []

  const insights: LiveGameInsight[] = []

  const sorted = [...players].sort((a, b) => b.totalScore - a.totalScore)
  const [first, second] = sorted

  // ── flip7_watch: valaki 5–6 különböző számnál jár ────────────────────────
  // Csak aktív körben, aktív játékosoknál
  if (currentRound && currentRound.status === 'active') {
    const watchCandidates = players
      .map((p) => {
        const state = currentRound.playerStates[p.uid]
        if (!state || state.status !== 'active') return null
        const unique = new Set(state.numberCards).size
        return unique >= 5 && unique < 7 ? { player: p, unique } : null
      })
      .filter((x): x is { player: typeof players[0]; unique: number } => x !== null)
      .sort((a, b) => b.unique - a.unique)

    if (watchCandidates.length > 0) {
      const { player, unique } = watchCandidates[0]
      insights.push({
        type: 'flip7_watch',
        playerUid: player.uid,
        title: '🎴 Flip 7 veszély',
        message: `${player.displayName} ${unique}/7 számnál jár`,
        tone: 'spicy',
        value: unique,
      })
    }
  }

  // ── hot_round: magas pontszám ebben a körben ──────────────────────────────
  if (currentRound && insights.length < 3) {
    const HOT_THRESHOLD = 25
    const hotCandidates = players
      .map((p) => {
        const state = currentRound.playerStates[p.uid]
        if (!state) return null
        // Kész kör → roundScore, aktív → számkártyák összege
        const score =
          state.roundScore !== null
            ? state.roundScore
            : state.numberCards.reduce((s, v) => s + v, 0)
        const eligible =
          state.status === 'stayed' ||
          state.status === 'flip7' ||
          state.status === 'active'
        return eligible && score >= HOT_THRESHOLD ? { player: p, score } : null
      })
      .filter((x): x is { player: typeof players[0]; score: number } => x !== null)
      .sort((a, b) => b.score - a.score)

    if (hotCandidates.length > 0) {
      const { player, score } = hotCandidates[0]
      // Ne duplikáljuk a flip7_watch-csal ha ugyanaz a játékos
      const alreadyFeatured = insights.some((i) => i.playerUid === player.uid)
      if (!alreadyFeatured) {
        insights.push({
          type: 'hot_round',
          playerUid: player.uid,
          title: '🚀 Nagy kör',
          message: `${player.displayName} most nagyot megy — ${score} pont`,
          tone: 'positive',
          value: score,
        })
      }
    }
  }

  // ── close_game: szoros állás a top kettő között ───────────────────────────
  if (roundCount >= 2 && second && insights.length < 3) {
    const gap = first.totalScore - second.totalScore
    if (gap >= 0 && gap <= 10 && first.totalScore > 0) {
      insights.push({
        type: 'close_game',
        title: '⚡ Szoros meccs',
        message: `Csak ${gap} pont különbség — bárki nyerhet`,
        tone: 'warning',
        value: gap,
      })
    }
  }

  // ── leader: egyértelmű vezető ─────────────────────────────────────────────
  if (roundCount >= 2 && second && insights.length < 3) {
    const gap = first.totalScore - second.totalScore
    if (gap > 10) {
      insights.push({
        type: 'leader',
        playerUid: first.uid,
        title: '🏅 Vezető',
        message: `${first.displayName} vezet +${gap}-cal`,
        tone: 'positive',
        value: gap,
      })
    }
  }

  // ── brutal_warning: negatív pont Revenge/Brutal módban ───────────────────
  if ((gameMode === 'brutal' || gameMode === 'revenge') && insights.length < 3) {
    const negativePlayers = players.filter((p) => p.totalScore < 0)
    if (negativePlayers.length > 0) {
      const worst = [...negativePlayers].sort((a, b) => a.totalScore - b.totalScore)[0]
      const alreadyFeatured = insights.some((i) => i.playerUid === worst.uid)
      if (!alreadyFeatured) {
        insights.push({
          type: 'brutal_warning',
          playerUid: worst.uid,
          title: '💀 Mínuszban',
          message: `${worst.displayName}: ${worst.totalScore} pont — fordulat kell`,
          tone: 'warning',
          value: worst.totalScore,
        })
      }
    }
  }

  // ── bust_streak: valaki kiesett ebben a körben ────────────────────────────
  if (currentRound && insights.length < 3) {
    const bustedNow = players.filter(
      (p) => currentRound.playerStates[p.uid]?.status === 'busted'
    )
    if (bustedNow.length > 0) {
      const names = bustedNow.map((p) => p.displayName).join(', ')
      insights.push({
        type: 'bust_streak',
        playerUid: bustedNow.length === 1 ? bustedNow[0].uid : undefined,
        title: '💥 Kiesett',
        message: bustedNow.length === 1
          ? `${names} kiesett ebben a körben`
          : `${names} — mindenki kiesett`,
        tone: 'neutral',
        value: bustedNow.length,
      })
    }
  }

  return insights.slice(0, 3)
}
