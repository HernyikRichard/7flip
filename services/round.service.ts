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
  type DrawResult,
} from '@/lib/gameStateMachine'
import { determineWinner, calculateBustScore } from '@/lib/scoreEngine'
import { getModeEngine } from '@/lib/game-modes'
import type { GameMode } from '@/types/gameMode.types'
import { refineDiscardTargetCards } from '@/lib/actionResolver'
import { getGame } from './game.service'
import type { Round, PendingAction, RoundPlayerState, CardRef } from '@/types'
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

  const engine = getModeEngine(game.gameMode ?? 'classic')
  let scoredStates = scoreRound(round.playerStates, engine.config)

  // ── Brutal Flip 7 choice alkalmazása ──────────────────────────────────────
  // A scoreRound UTÁN futtatjuk, hogy a busted penalty-k már ki legyenek számolva,
  // és a -15 büntetés / +15 bónusz felülírja a végső total-t.
  if (round.resolvedBrutalFlip7Choice) {
    const { chooserUid, targetUid } = round.resolvedBrutalFlip7Choice
    const FLIP7_AMOUNT = engine.config.flip7Bonus  // 15

    if (targetUid === chooserUid) {
      // Chooser +15 bónusz magának
      const s = scoredStates[chooserUid]
      if (s) {
        const newTotal = (s.roundScore ?? 0) + FLIP7_AMOUNT
        scoredStates = {
          ...scoredStates,
          [chooserUid]: {
            ...s,
            roundScore:     newTotal,
            scoreBreakdown: s.scoreBreakdown
              ? { ...s.scoreBreakdown, flip7Bonus: FLIP7_AMOUNT, total: newTotal }
              : s.scoreBreakdown,
          },
        }
      }
    } else {
      // Target −15 büntetés (negatív megengedett Brutal-ban)
      const s = scoredStates[targetUid]
      if (s) {
        const newTotal = (s.roundScore ?? 0) - FLIP7_AMOUNT
        scoredStates = {
          ...scoredStates,
          [targetUid]: {
            ...s,
            roundScore:     newTotal,
            scoreBreakdown: s.scoreBreakdown
              ? { ...s.scoreBreakdown, total: newTotal }
              : s.scoreBreakdown,
          },
        }
      }
    }
  }

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
): Promise<DrawResult['outcome']> {
  const playerState = currentPlayerStates[targetUid]
  if (!playerState) return 'number_added'

  const engine = getModeEngine((gameMode as GameMode) ?? 'classic')
  const result = applyCardToPlayer(card, playerState, currentPlayerStates, 0, engine.config)

  await updateRoundPlayerState(gameId, roundId, targetUid, result.updatedState)

  if (result.outcome === 'action_pending') {
    const pa = result.pendingAction
    // Swap / Steal hatástalan ha nincs face-up kártya a táblán — skip, kör folytatódik
    if ((pa.actionType === 'swap' || pa.actionType === 'steal') && pa.availableCards.length === 0) {
      return result.outcome
    }
    await setPendingAction(gameId, roundId, pa)
    return result.outcome
  }

  // ── Brutal Flip 7: choice-t kérünk a játékostól (+15 magának v. −15 ellenfélnek) ──
  if (result.outcome === 'flip7' && engine.config.brutalFlip7CanPunish) {
    const availableTargetUids = Object.keys(currentPlayerStates).filter(
      (uid) => uid !== targetUid
    )
    await Promise.all([
      updateDoc(doc(db, COLLECTIONS.GAMES, gameId, COLLECTIONS.ROUNDS, roundId), {
        pendingBrutalFlip7: { chooserUid: targetUid, availableTargetUids },
      }),
      updateDoc(doc(db, COLLECTIONS.GAMES, gameId), {
        status: 'awaiting_brutal_flip7',
      }),
    ])
    return result.outcome
  }

  const newPlayerStates = { ...currentPlayerStates, [targetUid]: result.updatedState }
  if (isRoundOver(newPlayerStates)) {
    await finishRound(gameId, roundId)
  }
  return result.outcome
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
  const engine = getModeEngine((gameMode as GameMode) ?? 'classic')
  for (const n of numbers) {
    const card: Card = { cardType: 'number', variant: 'normal', value: n }
    const result = applyCardToPlayer(card, state, currentPlayerStates, 0, engine.config)
    state = result.updatedState
    if (state.status === 'busted' || state.status === 'flip7') break
  }
  await updateRoundPlayerState(gameId, roundId, targetUid, state)

  // ── Brutal Flip 7: choice-t kérünk ───────────────────────────────────────
  if (state.status === 'flip7' && engine.config.brutalFlip7CanPunish) {
    const availableTargetUids = Object.keys(currentPlayerStates).filter(
      (uid) => uid !== targetUid
    )
    await Promise.all([
      updateDoc(doc(db, COLLECTIONS.GAMES, gameId, COLLECTIONS.ROUNDS, roundId), {
        pendingBrutalFlip7: { chooserUid: targetUid, availableTargetUids },
      }),
      updateDoc(doc(db, COLLECTIONS.GAMES, gameId), {
        status: 'awaiting_brutal_flip7',
      }),
    ])
    return
  }

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
  const state = currentPlayerStates[targetUid]
  // Nem állhat meg, ha The Zero miatt kötelező húznia
  if (state?.forcedHit) return
  const updatedState: RoundPlayerState = {
    ...state,
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
  const engine = getModeEngine((gameMode as GameMode) ?? 'classic')
  const state = currentPlayerStates[targetUid]
  const bustBreakdown = engine.calculateBustScore(state)
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

// ── Brutal Flip 7 choice feloldása ───────────────────────────────────────────
/**
 * A Flip 7-et elérő játékos dönt Brutal módban:
 * - targetUid === chooserUid → +15 bónusz magának
 * - targetUid !== chooserUid → −15 büntetés a célpontnak
 */
export async function resolveBrutalFlip7Choice(
  gameId: string,
  roundId: string,
  chooserUid: string,
  targetUid: string,
): Promise<void> {
  // Feloldott choice rögzítése — finishRound olvassa és alkalmazza
  await updateDoc(
    doc(db, COLLECTIONS.GAMES, gameId, COLLECTIONS.ROUNDS, roundId),
    {
      pendingBrutalFlip7:       null,
      resolvedBrutalFlip7Choice: { chooserUid, targetUid },
    }
  )
  // Game státusz visszaállítása, majd kör lezárása
  await updateDoc(doc(db, COLLECTIONS.GAMES, gameId), {
    status: 'in_round',
  })
  await finishRound(gameId, roundId)
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
  const engine = getModeEngine(
    ((gameMode ?? game?.gameMode ?? 'classic') as GameMode)
  )

  const resolvedAction: PendingAction = { ...action, resolvedTargetUid }
  const result = engine.resolveAction({ playerStates: currentPlayerStates, action: resolvedAction })

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

// ── Pending action törlése (pl. Flip Four korai vége bust miatt) ─────────────
export async function clearPendingAction(gameId: string, roundId: string): Promise<void> {
  await setPendingAction(gameId, roundId, null)
}

// ── Discard step 1: target player kiválasztása ───────────────────────────────
/**
 * Discard esetén a játékos kiválasztása után NEM oldja fel az akciót,
 * csak frissíti a pending action-t a resolvedTargetUid-dal és a szűkített
 * availableCards-szal (célpont játékos lapjai). A UI ezután kártyát kér.
 */
export async function selectActionTargetPlayer(
  gameId: string,
  roundId: string,
  action: PendingAction,
  targetUid: string,
  currentPlayerStates: Record<string, RoundPlayerState>
): Promise<void> {
  const withTarget: PendingAction = { ...action, resolvedTargetUid: targetUid }
  const refined = refineDiscardTargetCards(withTarget, currentPlayerStates)
  await setPendingAction(gameId, roundId, refined)
}

// ── Swap / Steal / Discard step 2: kártya kiválasztással feloldás ─────────────
/**
 * Swap:    sourceCard + targetCard (mindkettő kötelező)
 * Steal:   sourceCard = null, targetCard = elveendő lap
 * Discard: sourceCard = null, targetCard = eldobandó lap
 */
export async function resolveCardAction(
  gameId: string,
  roundId: string,
  action: PendingAction,
  sourceCard: CardRef | null,
  targetCard: CardRef,
  currentPlayerStates: Record<string, RoundPlayerState>,
  gameMode?: string
): Promise<void> {
  const game = await getGame(gameId)
  const engine = getModeEngine((gameMode ?? game?.gameMode ?? 'classic') as GameMode)

  const resolvedAction: PendingAction = {
    ...action,
    ...(sourceCard ? { resolvedSourceCard: sourceCard } : {}),
    resolvedTargetCard: targetCard,
  }

  const result = engine.resolveAction({ playerStates: currentPlayerStates, action: resolvedAction })

  for (const [uid, state] of Object.entries(result.updatedStates)) {
    if (state !== currentPlayerStates[uid]) {
      await updateRoundPlayerState(gameId, roundId, uid, state)
    }
  }

  await setPendingAction(gameId, roundId, null)

  if (isRoundOver(result.updatedStates)) {
    await finishRound(gameId, roundId)
  }
}
