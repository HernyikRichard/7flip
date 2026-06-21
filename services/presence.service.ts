import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import db from '@/lib/firebase/firestore'
import { COLLECTIONS } from '@/lib/constants'

export interface GamePresenceEntry {
  uid: string
  displayName?: string
  photoURL?: string | null
  role?: 'player' | 'spectator'
  currentView?: string
  onlineAt?: { toMillis: () => number }
}

const PRESENCE_CUTOFF_MS = 90_000

export async function setPresenceOnline(
  gameId: string,
  uid: string,
  extra?: Omit<GamePresenceEntry, 'uid' | 'onlineAt'>
): Promise<void> {
  await setDoc(
    doc(db, COLLECTIONS.GAMES, gameId, 'presence', uid),
    { uid, onlineAt: serverTimestamp(), ...extra },
    { merge: true }
  )
}

export async function setPresenceOffline(gameId: string, uid: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.GAMES, gameId, 'presence', uid))
}

/** Legacy: returns only uid list (backward compat). */
export function subscribePresence(
  gameId: string,
  onChange: (onlineUids: string[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, COLLECTIONS.GAMES, gameId, 'presence'),
    (snap) => {
      const cutoff = Date.now() - PRESENCE_CUTOFF_MS
      const uids = snap.docs
        .filter((d) => (d.data().onlineAt?.toMillis?.() ?? 0) > cutoff)
        .map((d) => d.data().uid as string)
      onChange(uids)
    }
  )
}

/** Rich: returns full presence entries with role/displayName. */
export function subscribeGamePresence(
  gameId: string,
  onChange: (entries: GamePresenceEntry[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, COLLECTIONS.GAMES, gameId, 'presence'),
    (snap) => {
      const cutoff = Date.now() - PRESENCE_CUTOFF_MS
      const entries: GamePresenceEntry[] = snap.docs
        .filter((d) => (d.data().onlineAt?.toMillis?.() ?? 0) > cutoff)
        .map((d) => d.data() as GamePresenceEntry)
      onChange(entries)
    }
  )
}
