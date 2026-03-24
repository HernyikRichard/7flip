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
  getActivePlayers,
  applyCardToPlayer,
} from '@/lib/gameStateMachine'
import { determineWinner } from '@/lib/scoreEngine'
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

  const scoredStates = scoreRound(round.playerStates)

  const game = await getGame(gameId)
  if (!game) return

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
  currentPlayerStates: Record<string, RoundPlayerState>
): Promise<void> {
  const playerState = currentPlayerStates[targetUid]
  if (!playerState) return

  const activeUids = getActivePlayers(currentPlayerStates)
  const result = applyCardToPlayer(card, playerState, activeUids)

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
  currentPlayerStates: Record<string, RoundPlayerState>
): Promise<void> {
  let state = currentPlayerStates[targetUid]
  if (!state) return
  const activeUids = getActivePlayers(currentPlayerStates)
  for (const n of numbers) {
    const result = applyCardToPlayer({ cardType: 'number', value: n }, state, activeUids)
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
    status: 'standing',
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
  currentPlayerStates: Record<string, RoundPlayerState>
): Promise<void> {
  const updatedState: RoundPlayerState = {
    ...currentPlayerStates[targetUid],
    status: 'busted',
    roundScore: 0,
    scoreBreakdown: { numberSum: 0, x2Applied: false, doubledSum: 0, modifierBonus: 0, flip7Bonus: 0, total: 0, busted: true },
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
    status: 'standing',
    roundScore: score,
    scoreBreakdown: { numberSum: score, x2Applied: false, doubledSum: score, modifierBonus: 0, flip7Bonus: 0, total: score, busted: false },
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
  currentPlayerStates: Record<string, RoundPlayerState>
): Promise<void> {
  let newStates = { ...currentPlayerStates }

  if (action.actionType === 'freeze') {
    const updatedTarget: RoundPlayerState = {
      ...currentPlayerStates[resolvedTargetUid],
      status: 'frozen',
    }
    await updateRoundPlayerState(gameId, roundId, resolvedTargetUid, updatedTarget)
    newStates = { ...newStates, [resolvedTargetUid]: updatedTarget }
  }

  await setPendingAction(gameId, roundId, null)

  if (action.actionType !== 'flip_three' && isRoundOver(newStates)) {
    await finishRound(gameId, roundId)
  }
}
