import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  arrayUnion,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import db from '@/lib/firebase/firestore'
import { COLLECTIONS } from '@/lib/constants'
import { initRoundPlayerStates, scoreRound, isRoundOver, getActivePlayers, applyCardToPlayer } from '@/lib/gameStateMachine'
import { determineWinner, calculateBustScore } from '@/lib/scoreEngine'
import { getModeEngine } from '@/lib/game-modes'
import { getGameModeConfig } from '@/lib/gameModes'
import { resolveAction } from '@/lib/actionResolver'
import type { GameMode } from '@/types/gameMode.types'
import type { Game, Round, GameEvent, CreateGameData, PendingAction, RoundPlayerState } from '@/types'
import type { Card } from '@/types/card.types'
import { writeNotification } from './notification.service'

// ── Játék létrehozása ────────────────────────────────────────────────────────
export async function createGame(data: CreateGameData): Promise<string> {
  const config = getGameModeConfig(data.gameMode)
  const ref = await addDoc(collection(db, COLLECTIONS.GAMES), {
    createdBy: data.createdBy,
    status: 'waiting_for_players',
    players: data.players,
    playerUids: data.playerUids,
    roundCount: 0,
    targetScore: config.targetScore,
    gameMode: data.gameMode ?? 'classic',
    pendingAction: null,
    currentRoundId: null,
    rulesVersion: 2,
    createdAt: serverTimestamp(),
    finishedAt: null,
    winnerId: null,
  })
  return ref.id
}

// ── Játék lekérése ──────────────────────────────────────────────────────────
export async function getGame(gameId: string): Promise<Game | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.GAMES, gameId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Game
}

// ── Real-time játék figyelés ─────────────────────────────────────────────────
export function subscribeGame(
  gameId: string,
  onChange: (game: Game | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, COLLECTIONS.GAMES, gameId), (snap) => {
    onChange(snap.exists() ? ({ id: snap.id, ...snap.data() } as Game) : null)
  })
}

// ── Felhasználó játékainak real-time listája ─────────────────────────────────
export function subscribeUserGames(
  uid: string,
  onChange: (games: Game[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.GAMES),
    where('playerUids', 'array-contains', uid),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Game))
  })
}

// ── Kör indítása ─────────────────────────────────────────────────────────────
export async function startRound(gameId: string, playerUids: string[]): Promise<string> {
  const roundRef = await addDoc(
    collection(db, COLLECTIONS.GAMES, gameId, COLLECTIONS.ROUNDS),
    {
      roundNumber: (await getGame(gameId))?.roundCount ?? 0 + 1,
      status: 'active',
      playerStates: initRoundPlayerStates(playerUids),
      pendingAction: null,
      turnOrder: playerUids,
      createdAt: serverTimestamp(),
      finishedAt: null,
    }
  )

  await updateDoc(doc(db, COLLECTIONS.GAMES, gameId), {
    status: 'in_round',
    roundCount: ((await getGame(gameId))?.roundCount ?? 0) + 1,
    currentRoundId: roundRef.id,
  })

  return roundRef.id
}

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
    const doc_ = snap.docs[0]
    onChange({ id: doc_.id, ...doc_.data() } as Round)
  })
}

// ── Játékos állapot frissítése a körben ──────────────────────────────────────
export async function updateRoundPlayerState(
  gameId: string,
  roundId: string,
  uid: string,
  newState: Round['playerStates'][string]
): Promise<void> {
  await updateDoc(
    doc(db, COLLECTIONS.GAMES, gameId, COLLECTIONS.ROUNDS, roundId),
    { [`playerStates.${uid}`]: newState }
  )
}

// ── Függő akció mentése / törlése ────────────────────────────────────────────
export async function setPendingAction(
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

  // Játékos totalScore frissítése
  const game = await getGame(gameId)
  if (!game) return

  // Pontozás — engine szerint (bust büntetés játékmód alapján)
  const engine = getModeEngine(game.gameMode ?? 'classic')
  const scoredStates = scoreRound(round.playerStates, engine.config)

  const updatedPlayers = game.players.map((p) => {
    const roundScore = scoredStates[p.uid]?.roundScore ?? 0
    return {
      ...p,
      totalScore: p.totalScore + roundScore,
      roundsPlayed: p.roundsPlayed + 1,
    }
  })

  // Győztes meghatározása
  const totalScores: Record<string, number> = {}
  updatedPlayers.forEach((p) => { totalScores[p.uid] = p.totalScore })
  const winnerId = determineWinner(totalScores, game.targetScore)

  // Kör dokumentum frissítése
  await updateDoc(doc(db, COLLECTIONS.GAMES, gameId, COLLECTIONS.ROUNDS, roundId), {
    playerStates: scoredStates,
    status: 'finished',
    finishedAt: serverTimestamp(),
  })

  // Játék dokumentum frissítése
  await updateDoc(doc(db, COLLECTIONS.GAMES, gameId), {
    players: updatedPlayers,
    status: winnerId ? 'game_finished' : 'round_finished',
    pendingAction: null,
    ...(winnerId ? { winnerId, finishedAt: serverTimestamp() } : {}),
  })

  // Megjegyzés: gamesPlayed/gamesWon stat frissítése Cloud Function feladata
  // (client-side nem írhat más user dokumentumára — Firestore rules tiltja)
}

// ── Esemény naplózása ────────────────────────────────────────────────────────
export async function logEvent(
  gameId: string,
  roundId: string,
  event: Omit<GameEvent, 'id' | 'createdAt'>
): Promise<void> {
  await addDoc(
    collection(db, COLLECTIONS.GAMES, gameId, COLLECTIONS.ROUNDS, roundId, 'events'),
    { ...event, createdAt: serverTimestamp() }
  )
}

// ── Játékos meghívása meglévő lobbiba ────────────────────────────────────────
export async function invitePlayersToGame(
  gameId: string,
  newPlayers: { uid: string; displayName: string; photoURL: string | null }[]
): Promise<void> {
  const game = await getGame(gameId)
  if (!game) return

  const toAdd = newPlayers.filter((p) => !game.playerUids.includes(p.uid))
  if (toAdd.length === 0) return

  const addedPlayers = toAdd.map((p) => ({
    uid: p.uid,
    displayName: p.displayName,
    photoURL: p.photoURL,
    totalScore: 0,
    roundsPlayed: 0,
    inviteStatus: 'pending' as const,
  }))

  await updateDoc(doc(db, COLLECTIONS.GAMES, gameId), {
    players: [...game.players, ...addedPlayers],
    playerUids: [...game.playerUids, ...toAdd.map((p) => p.uid)],
  })
}

// ── Meghívás elfogadása / elutasítása ────────────────────────────────────────
export async function respondToInvite(
  gameId: string,
  uid: string,
  response: 'accepted' | 'declined'
): Promise<void> {
  const game = await getGame(gameId)
  if (!game) return

  if (response === 'accepted') {
    const updatedPlayers = game.players.map((p) =>
      p.uid === uid ? { ...p, inviteStatus: 'accepted' as const } : p
    )
    await updateDoc(doc(db, COLLECTIONS.GAMES, gameId), { players: updatedPlayers })
  } else {
    // Értesítés a játék létrehozójának (ha nem ő utasítja el saját magát)
    if (game.createdBy !== uid) {
      const decliner = game.players.find((p) => p.uid === uid)
      if (decliner) {
        await writeNotification(game.createdBy, {
          type: 'invite_declined',
          recipientUid: game.createdBy,
          actorName: decliner.displayName,
          gameId,
        })
      }
    }
    const updatedPlayers = game.players.filter((p) => p.uid !== uid)
    const updatedPlayerUids = game.playerUids.filter((id) => id !== uid)
    await updateDoc(doc(db, COLLECTIONS.GAMES, gameId), {
      players: updatedPlayers,
      playerUids: updatedPlayerUids,
    })
  }
}

// ── Kártyahúzás rögzítése egy játékosnak ─────────────────────────────────────
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

  const engine = getModeEngine((gameMode as GameMode) ?? 'classic')
  const result = applyCardToPlayer(card, playerState, currentPlayerStates, 0, engine.config)

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

  // Frissített állapotok mentése Firestore-ba
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

// ── Játék összes körének lekérése (history) ──────────────────────────────────
export async function getGameRounds(gameId: string): Promise<Round[]> {
  const q = query(
    collection(db, COLLECTIONS.GAMES, gameId, COLLECTIONS.ROUNDS),
    orderBy('roundNumber', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Round)
}

// ── Visszavágó: új játék azonos játékosokkal + módban ────────────────────────
export async function rematchGame(gameId: string, initiatorUid: string): Promise<string> {
  const game = await getGame(gameId)
  if (!game) throw new Error('Game not found')

  const config = getGameModeConfig(game.gameMode ?? 'classic')

  const ref = await addDoc(collection(db, COLLECTIONS.GAMES), {
    createdBy: initiatorUid,
    status: 'waiting_for_players',
    players: game.players.map((p) => ({
      uid:          p.uid,
      displayName:  p.displayName,
      photoURL:     p.photoURL ?? null,
      totalScore:   0,
      roundsPlayed: 0,
      // Visszavágóban mindenki automatikusan "elfogadta" — lobby phase kimarad
      inviteStatus: 'accepted' as const,
    })),
    playerUids:   game.playerUids,
    roundCount:   0,
    targetScore:  config.targetScore,
    gameMode:     game.gameMode ?? 'classic',
    pendingAction: null,
    currentRoundId: null,
    rulesVersion: 2,
    rematchOf:    gameId,
    createdAt:    serverTimestamp(),
    finishedAt:   null,
    winnerId:     null,
  })

  return ref.id
}

// ── Játék befejezése (manuális) ──────────────────────────────────────────────
export async function forceFinishGame(gameId: string, winnerId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.GAMES, gameId), {
    status: 'game_finished',
    winnerId,
    finishedAt: serverTimestamp(),
  })
  // Megjegyzés: gamesPlayed/gamesWon stat frissítése Cloud Function feladata
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
    if (state.status === 'busted') break
  }
  await updateRoundPlayerState(gameId, roundId, targetUid, state)
  const newPlayerStates = { ...currentPlayerStates, [targetUid]: state }
  if (isRoundOver(newPlayerStates)) {
    await finishRound(gameId, roundId)
  }
}

