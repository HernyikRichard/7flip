import {
  collection,
  doc,
  writeBatch,
  onSnapshot,
  query,
  where,
  documentId,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import db from '@/lib/firebase/firestore'
import { COLLECTIONS } from '@/lib/constants'
import type { UserActiveGameStatus } from '@/types'
import type { GameStatus } from '@/types/game.types'
import type { GameMode } from '@/types/gameMode.types'

export async function setUsersActiveGame(
  playerUids: string[],
  gameId: string,
  status: GameStatus,
  mode: GameMode
): Promise<void> {
  if (playerUids.length === 0) return
  try {
    const batch = writeBatch(db)
    playerUids.forEach((uid) => {
      batch.set(
        doc(db, COLLECTIONS.USER_STATUS, uid),
        { activeGameId: gameId, activeGameStatus: status, activeGameMode: mode, updatedAt: serverTimestamp() },
        { merge: true }
      )
    })
    await batch.commit()
  } catch {
    // best-effort: ne törje meg a játék flow-t ha a userStatus írás nem sikerül
  }
}

export async function clearUsersActiveGame(playerUids: string[]): Promise<void> {
  if (playerUids.length === 0) return
  try {
    const batch = writeBatch(db)
    playerUids.forEach((uid) => {
      batch.set(
        doc(db, COLLECTIONS.USER_STATUS, uid),
        { activeGameId: null, activeGameStatus: null, activeGameMode: null, updatedAt: serverTimestamp() },
        { merge: true }
      )
    })
    await batch.commit()
  } catch {
    // best-effort
  }
}

export function subscribeUsersStatus(
  uids: string[],
  onChange: (statuses: Record<string, UserActiveGameStatus>) => void
): Unsubscribe {
  if (uids.length === 0) {
    onChange({})
    return () => {}
  }
  const q = query(
    collection(db, COLLECTIONS.USER_STATUS),
    where(documentId(), 'in', uids.slice(0, 30))
  )
  return onSnapshot(q, (snap) => {
    const statuses: Record<string, UserActiveGameStatus> = {}
    snap.docs.forEach((d) => {
      statuses[d.id] = d.data() as UserActiveGameStatus
    })
    onChange(statuses)
  })
}
