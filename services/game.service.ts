import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import db from '@/lib/firebase/firestore'
import { COLLECTIONS } from '@/lib/constants'
import { initRoundPlayerStates } from '@/lib/gameStateMachine'
import { getGameModeConfig } from '@/lib/gameModes'
import type { Game, Round, CreateGameData } from '@/types'
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
      ...(p.isGuest ? { isGuest: true } : {}),
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
