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
  limit,
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
import { setUsersActiveGame, clearUsersActiveGame } from './userStatus.service'

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
  await setUsersActiveGame(data.playerUids, ref.id, 'waiting_for_players', data.gameMode)
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
  const game = await getGame(gameId)
  const roundCount = game?.roundCount ?? 0
  const gameMode = game?.gameMode ?? 'classic'

  const roundRef = await addDoc(
    collection(db, COLLECTIONS.GAMES, gameId, COLLECTIONS.ROUNDS),
    {
      roundNumber: roundCount + 1,
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
    roundCount: roundCount + 1,
    currentRoundId: roundRef.id,
  })

  await setUsersActiveGame(playerUids, gameId, 'in_round', gameMode)
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

  await setUsersActiveGame(toAdd.map((p) => p.uid), gameId, 'waiting_for_players', game.gameMode ?? 'classic')
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
    await clearUsersActiveGame([uid])
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

  await setUsersActiveGame(game.playerUids, ref.id, 'waiting_for_players', game.gameMode ?? 'classic')
  return ref.id
}

// ── QR meghívó: kód generálás / aktiválás ────────────────────────────────────
/**
 * Invite code-ot generál (ha nincs), bekapcsolja és visszaadja a kódot.
 * Idempotens: ha már van aktív kód, azt adja vissza.
 */
export async function enableGameInvite(gameId: string): Promise<string> {
  const game = await getGame(gameId)
  if (!game) throw new Error('Game not found')

  if (game.inviteCode && game.inviteEnabled) return game.inviteCode

  const code = Math.random().toString(36).substring(2, 10)
  await updateDoc(doc(db, COLLECTIONS.GAMES, gameId), {
    inviteCode: code,
    inviteEnabled: true,
  })
  return code
}

// ── QR meghívó: keresés kód alapján ─────────────────────────────────────────
export async function getGameByInviteCode(code: string): Promise<Game | null> {
  const q = query(
    collection(db, COLLECTIONS.GAMES),
    where('inviteCode', '==', code),
    limit(1)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  const game = { id: d.id, ...d.data() } as Game
  if (!game.inviteEnabled) return null
  return game
}

// ── QR meghívó: csatlakozás ──────────────────────────────────────────────────
export async function joinGameByInvite(
  gameId: string,
  player: { uid: string; displayName: string; photoURL: string | null }
): Promise<void> {
  const game = await getGame(gameId)
  if (!game) throw new Error('Game not found')
  if (!game.inviteEnabled || game.status !== 'waiting_for_players') {
    throw new Error('Invite not active')
  }
  if (game.playerUids.includes(player.uid)) return  // már játékos, siker

  const newPlayer = {
    uid: player.uid,
    displayName: player.displayName,
    photoURL: player.photoURL,
    totalScore: 0,
    roundsPlayed: 0,
    inviteStatus: 'accepted' as const,
  }
  await updateDoc(doc(db, COLLECTIONS.GAMES, gameId), {
    players: [...game.players, newPlayer],
    playerUids: [...game.playerUids, player.uid],
  })
  await setUsersActiveGame([player.uid], gameId, game.status, game.gameMode ?? 'classic')
}

// ── Játék befejezése (manuális) ──────────────────────────────────────────────
export async function forceFinishGame(gameId: string, winnerId: string): Promise<void> {
  const game = await getGame(gameId)
  await updateDoc(doc(db, COLLECTIONS.GAMES, gameId), {
    status: 'game_finished',
    winnerId,
    finishedAt: serverTimestamp(),
  })
  if (game) await clearUsersActiveGame(game.playerUids)
  // Megjegyzés: gamesPlayed/gamesWon stat frissítése Cloud Function feladata
}

export async function enableSpectating(gameId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.GAMES, gameId), { spectateEnabled: true })
}

export async function disableSpectating(gameId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.GAMES, gameId), { spectateEnabled: false })
}
