import type { Game, Round } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type RecapAwardType =
  | 'biggest_comeback'
  | 'most_busts'
  | 'most_flip7'
  | 'highest_round'
  | 'lowest_round'
  | 'most_stable'

export interface RecapAward {
  type: RecapAwardType
  icon: string
  title: string
  description: string
  playerUid: string
  value: number
}

export interface PlayerRecapStats {
  busts: number
  flip7s: number
  highestRound: number
  lowestRound: number
  roundsPlayed: number
}

export interface GameRecap {
  awards: RecapAward[]
  statsByPlayer: Record<string, PlayerRecapStats>
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FUNCTION — pure, Firebase-free
// ─────────────────────────────────────────────────────────────────────────────

export function computeGameRecap(game: Game, rounds: Round[]): GameRecap {
  const playerUids = game.playerUids
  const finishedRounds = rounds.filter((r) => r.status === 'finished')

  // ── Per-player stat accumulators ─────────────────────────────────────────
  const statsByPlayer: Record<string, PlayerRecapStats> = {}
  for (const uid of playerUids) {
    statsByPlayer[uid] = {
      busts: 0,
      flip7s: 0,
      highestRound: -Infinity,
      lowestRound: Infinity,
      roundsPlayed: 0,
    }
  }

  // Running cumulative totals per player (for comeback calc): starts at [0]
  const runningTotals: Record<string, number[]> = {}
  for (const uid of playerUids) runningTotals[uid] = [0]

  for (const round of finishedRounds) {
    for (const uid of playerUids) {
      const state = round.playerStates[uid]
      if (!state || state.roundScore === null) continue

      const stats = statsByPlayer[uid]
      stats.roundsPlayed++
      if (state.status === 'busted') stats.busts++
      if (state.status === 'flip7') stats.flip7s++
      if (state.roundScore > stats.highestRound) stats.highestRound = state.roundScore
      if (state.roundScore < stats.lowestRound) stats.lowestRound = state.roundScore

      const prev = runningTotals[uid][runningTotals[uid].length - 1]
      runningTotals[uid].push(prev + state.roundScore)
    }
  }

  // Fix Infinity defaults for players with no scored rounds
  for (const uid of playerUids) {
    const s = statsByPlayer[uid]
    if (s.highestRound === -Infinity) s.highestRound = 0
    if (s.lowestRound === Infinity) s.lowestRound = 0
  }

  const awards: RecapAward[] = []

  // ── most_flip7 ────────────────────────────────────────────────────────────
  const flip7Leader = findLeader(playerUids, statsByPlayer, (s) => s.flip7s)
  if (flip7Leader && statsByPlayer[flip7Leader].flip7s > 0) {
    const v = statsByPlayer[flip7Leader].flip7s
    awards.push({
      type: 'most_flip7',
      icon: '🎴',
      title: 'Flip 7 mágus',
      description: `${v}× Flip 7`,
      playerUid: flip7Leader,
      value: v,
    })
  }

  // ── highest_round ─────────────────────────────────────────────────────────
  const highRoundLeader = findLeader(
    playerUids.filter((uid) => statsByPlayer[uid].roundsPlayed > 0),
    statsByPlayer,
    (s) => s.highestRound,
  )
  if (highRoundLeader && statsByPlayer[highRoundLeader].highestRound > 0) {
    const v = statsByPlayer[highRoundLeader].highestRound
    awards.push({
      type: 'highest_round',
      icon: '🚀',
      title: 'Legnagyobb kör',
      description: `${v} pont egy körben`,
      playerUid: highRoundLeader,
      value: v,
    })
  }

  // ── most_busts ────────────────────────────────────────────────────────────
  const bustLeader = findLeader(playerUids, statsByPlayer, (s) => s.busts)
  if (bustLeader && statsByPlayer[bustLeader].busts > 0) {
    const v = statsByPlayer[bustLeader].busts
    awards.push({
      type: 'most_busts',
      icon: '💥',
      title: 'Bust király',
      description: `${v}× kiesett`,
      playerUid: bustLeader,
      value: v,
    })
  }

  // ── biggest_comeback (negative-dip only — Revenge/Brutal) ────────────────
  interface ComebackEntry { uid: string; comeback: number; minRunning: number }
  const comebackEntries: ComebackEntry[] = playerUids
    .filter((uid) => runningTotals[uid].length >= 3) // at least 2 rounds
    .map((uid) => {
      const totals = runningTotals[uid]
      const finalTotal = totals[totals.length - 1]
      const minRunning = Math.min(...totals)
      return { uid, comeback: finalTotal - minRunning, minRunning }
    })
    .filter((e) => e.minRunning < 0 && e.comeback >= 20)
    .sort((a, b) => b.comeback - a.comeback || a.uid.localeCompare(b.uid))
  const topComeback = comebackEntries[0]
  if (topComeback) {
    awards.push({
      type: 'biggest_comeback',
      icon: '📈',
      title: 'Legnagyobb comeback',
      description: `+${topComeback.comeback} pont fordulat`,
      playerUid: topComeback.uid,
      value: topComeback.comeback,
    })
  }

  // ── lowest_round (Revenge / Brutal only) ─────────────────────────────────
  if (game.gameMode === 'revenge' || game.gameMode === 'brutal') {
    const lowLeader = playerUids
      .filter((uid) => statsByPlayer[uid].lowestRound < 0)
      .sort((a, b) => {
        const diff = statsByPlayer[a].lowestRound - statsByPlayer[b].lowestRound
        return diff !== 0 ? diff : a.localeCompare(b)
      })[0]
    if (lowLeader) {
      const v = statsByPlayer[lowLeader].lowestRound
      awards.push({
        type: 'lowest_round',
        icon: '📉',
        title: 'Legkeményebb mínusz',
        description: `${v} pont egy körben`,
        playerUid: lowLeader,
        value: v,
      })
    }
  }

  // ── most_stable (0 busts, min 2 rounds) ──────────────────────────────────
  const perfectPlayers = playerUids
    .filter((uid) => statsByPlayer[uid].roundsPlayed >= 2 && statsByPlayer[uid].busts === 0)
    .sort((a, b) => statsByPlayer[b].roundsPlayed - statsByPlayer[a].roundsPlayed || a.localeCompare(b))
  const stableLeader = perfectPlayers[0]
  if (stableLeader) {
    const r = statsByPlayer[stableLeader].roundsPlayed
    awards.push({
      type: 'most_stable',
      icon: '🛡️',
      title: 'Legstabilabb',
      description: `${r} körből 0 bust`,
      playerUid: stableLeader,
      value: r,
    })
  }

  return { awards, statsByPlayer }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function findLeader(
  uids: string[],
  stats: Record<string, PlayerRecapStats>,
  scorer: (s: PlayerRecapStats) => number,
): string | undefined {
  return [...uids]
    .sort((a, b) => {
      const diff = scorer(stats[b]) - scorer(stats[a])
      return diff !== 0 ? diff : a.localeCompare(b)
    })[0]
}
