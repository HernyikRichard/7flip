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

export async function setPresenceOnline(gameId: string, uid: string): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.GAMES, gameId, 'presence', uid), {
    uid,
    onlineAt: serverTimestamp(),
  })
}

export async function setPresenceOffline(gameId: string, uid: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.GAMES, gameId, 'presence', uid))
}

export function subscribePresence(
  gameId: string,
  onChange: (onlineUids: string[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, COLLECTIONS.GAMES, gameId, 'presence'),
    (snap) => {
      const cutoff = Date.now() - 90_000
      const uids = snap.docs
        .filter((d) => (d.data().onlineAt?.toMillis?.() ?? 0) > cutoff)
        .map((d) => d.data().uid as string)
      onChange(uids)
    }
  )
}
