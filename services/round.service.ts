import {
  collection,
  doc,
  getDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import db from '@/lib/firebase/firestore'
import { COLLECTIONS } from '@/lib/constants'
import {
  scoreRound,
  isRoundOver,
  applyCardToPlayer,
} from '@/lib/gameStateMachine'
import { determineWinner, calculateBustScore } from '@/lib/scoreEngine'
import { getGameModeConfig } from '@/lib/gameModes'
import { resolveAction } from '@/lib/actionResolver'
import { getGame } from './game.service'
import type { Round, PendingAction, RoundPlayerState } from '@/types'
import type { Card } from '@/types/card.types'

// ── Kör real-time figyelés ───────────────────────────────────────────────────
export function subscribeRound(
  gameId: string,
  roundId: string,
  onChange: (round: Round | null) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, COLLECTIONS.GAMES, gameId, COLLECTIONS.ROUNDS, roundId),
    (snap) => {
      onChange(snap.exists() ? ({ id: snap.id, ...snap.data() } as Round) : null)
    }
  )
}

// ── Legutóbbi kör real-time figyelés ─────────────────────────────────────────
export function subscribeLatestRound(
  gameId: string,
  onChange: (round: Round | null) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.GAMES, gameId, COLLECTIONS.ROUNDS),
    orderBy('roundNumber', 'desc')
  )
  return onSnapshot(q, (snap) => {
    if (snap.empty) { onChange(null); return }
    const d = snap.docs[0]
    onChange({ id: d.id, ...d.data() } as Round)
  })
}

// ── Játékos állapot frissítése ───────────────────────────────────────────────
async function updateRoundPlayerState(
  gameId: string,
  roundId: string,
  uid: string,
  newState: RoundPlayerState
): Promise<void> {
  await updateDoc(
    doc(db, COLLECTIONS.GAMES, gameId, COLLECTIONS.ROUNDS, roundId),
    { [`playerStates.${uid}`]: newState }
  )
}

// ── Függő akció mentése / törlése ────────────────────────────────────────────
async function setPendingAction(
  gameId: string,
  roundId: string,
  action: PendingAction | null
): Promise<void> {
  await Promise.all([
    updateDoc(doc(db, COLLECTIONS.GAMES, gameId, COLLECTIONS.ROUNDS, roundId), {
      pendingAction: action,
    }),
    updateDoc(doc(db, COLLECTIONS.GAMES, gameId), {
      pendingAction: action,
      status: action ? 'awaiting_action' : 'in_round',
    }),
  ])
}

// ── Kör befejezése — pontozás + game frissítés ───────────────────────────────
export async function finishRound(gameId: string, roundId: string): Promise<void> {
  const roundSnap = await getDoc(
    doc(db, COLLECTIONS.GAMES, gameId, COLLECTIONS.ROUNDS, roundId)
  )
  if (!roundSnap.exists()) return
  const round = { id: roundSnap.id, ...roundSnap.data() } as Round

  const game = await getGame(gameId)
  if (!game) return

  const config = getGameModeConfig(game.gameMode ?? 'classic', game.brutalMode ?? false)
  const scoredStates = scoreRound(round.playerStates, config)

  const updatedPlayers = game.players.map((p) => {
    const roundScore = scoredStates[p.uid]?.roundScore ?? 0
    return {
      ...p,
      totalScore: p.totalScore + roundScore,
      roundsPlayed: p.roundsPlayed + 1,
    }
  })

  const totalScores: Record<string, number> = {}
  updatedPlayers.forEach((p) => { totalScores[p.uid] = p.totalScore })
  const winnerId = determineWinner(totalScores, game.targetScore)

  await updateDoc(doc(db, COLLECTIONS.GAMES, gameId, COLLECTIONS.ROUNDS, roundId), {
    playerStates: scoredStates,
    status: 'finished',
    finishedAt: serverTimestamp(),
  })

  await updateDoc(doc(db, COLLECTIONS.GAMES, gameId), {
    players: updatedPlayers,
    status: winnerId ? 'game_finished' : 'round_finished',
    pendingAction: null,
    ...(winnerId ? { winnerId, finishedAt: serverTimestamp() } : {}),
  })
}

// ── Kártyahúzás ──────────────────────────────────────────────────────────────
export async function drawCardForPlayer(
  gameId: string,
  roundId: string,
  targetUid: string,
  card: Card,
  currentPlayerStates: Record<string, RoundPlayerState>,
  gameMode?: string
): Promise<void> {
  const playerState = currentPlayerStates[targetUid]
  if (!playerState) return

  const config = getGameModeConfig((gameMode as 'classic' | 'revenge') ?? 'classic')
  const result = applyCardToPlayer(card, playerState, currentPlayerStates, 0, config)

  await updateRoundPlayerState(gameId, roundId, targetUid, result.updatedState)

  if (result.outcome === 'action_pending') {
    await setPendingAction(gameId, roundId, result.pendingAction)
    return
  }

  const newPlayerStates = { ...currentPlayerStates, [targetUid]: result.updatedState }
  if (isRoundOver(newPlayerStates)) {
    await finishRound(gameId, roundId)
  }
}

// ── Több számkártya egyszerre ─────────────────────────────────────────────────
export async function drawMultipleCardsForPlayer(
  gameId: string,
  roundId: string,
  targetUid: string,
  numbers: number[],
  currentPlayerStates: Record<string, RoundPlayerState>,
  gameMode?: string
): Promise<void> {
  let state = currentPlayerStates[targetUid]
  if (!state) return
  const config = getGameModeConfig((gameMode as 'classic' | 'revenge') ?? 'classic')
  for (const n of numbers) {
    const card: Card = { cardType: 'number', variant: 'normal', value: n }
    const result = applyCardToPlayer(card, state, currentPlayerStates, 0, config)
    state = result.updatedState
    if (state.status === 'busted') break
  }
  await updateRoundPlayerState(gameId, roundId, targetUid, state)
  const newPlayerStates = { ...currentPlayerStates, [targetUid]: state }
  if (isRoundOver(newPlayerStates)) {
    await finishRound(gameId, roundId)
  }
}

// ── Játékos megállása ─────────────────────────────────────────────────────────
export async function standPlayer(
  gameId: string,
  roundId: string,
  targetUid: string,
  currentPlayerStates: Record<string, RoundPlayerState>
): Promise<void> {
  const updatedState: RoundPlayerState = {
    ...currentPlayerStates[targetUid],
    status: 'stayed',
  }
  await updateRoundPlayerState(gameId, roundId, targetUid, updatedState)
  const newPlayerStates = { ...currentPlayerStates, [targetUid]: updatedState }
  if (isRoundOver(newPlayerStates)) {
    await finishRound(gameId, roundId)
  }
}

// ── Azonnali bust ─────────────────────────────────────────────────────────────
export async function bustPlayerManually(
  gameId: string,
  roundId: string,
  targetUid: string,
  currentPlayerStates: Record<string, RoundPlayerState>,
  gameMode?: string
): Promise<void> {
  const config = getGameModeConfig((gameMode as 'classic' | 'revenge') ?? 'classic')
  const state = currentPlayerStates[targetUid]
  const bustBreakdown = calculateBustScore(state, config)
  const updatedState: RoundPlayerState = {
    ...state,
    status: 'busted',
    roundScore: bustBreakdown.total,
    scoreBreakdown: bustBreakdown,
  }
  await updateRoundPlayerState(gameId, roundId, targetUid, updatedState)
  const newPlayerStates = { ...currentPlayerStates, [targetUid]: updatedState }
  if (isRoundOver(newPlayerStates)) {
    await finishRound(gameId, roundId)
  }
}

// ── Közvetlen pont rögzítése ──────────────────────────────────────────────────
export async function setDirectScore(
  gameId: string,
  roundId: string,
  targetUid: string,
  score: number,
  currentPlayerStates: Record<string, RoundPlayerState>
): Promise<void> {
  const updatedState: RoundPlayerState = {
    ...currentPlayerStates[targetUid],
    status: 'stayed',
    roundScore: score,
    scoreBreakdown: {
      numberSum: score, divide2Applied: false, halvedSum: score,
      modifierPenalty: 0, baseScore: score, flip7Bonus: 0,
      total: score, busted: false, forcedZero: false,
    },
  }
  await updateRoundPlayerState(gameId, roundId, targetUid, updatedState)
  const newPlayerStates = { ...currentPlayerStates, [targetUid]: updatedState }
  if (isRoundOver(newPlayerStates)) {
    await finishRound(gameId, roundId)
  }
}

// ── Akciókártya feloldása ─────────────────────────────────────────────────────
export async function resolveActionForTarget(
  gameId: string,
  roundId: string,
  action: PendingAction,
  resolvedTargetUid: string,
  currentPlayerStates: Record<string, RoundPlayerState>,
  gameMode?: string
): Promise<void> {
  const game = await getGame(gameId)
  const config = getGameModeConfig(
    (gameMode ?? game?.gameMode ?? 'classic') as 'classic' | 'revenge',
    game?.brutalMode ?? false
  )

  const resolvedAction: PendingAction = { ...action, resolvedTargetUid }
  const result = resolveAction({ playerStates: currentPlayerStates, action: resolvedAction, config })

  for (const [uid, state] of Object.entries(result.updatedStates)) {
    if (state !== currentPlayerStates[uid]) {
      await updateRoundPlayerState(gameId, roundId, uid, state)
    }
  }

  await setPendingAction(gameId, roundId, result.nextPendingAction)

  if (!result.nextPendingAction && isRoundOver(result.updatedStates)) {
    await finishRound(gameId, roundId)
  }
}
