import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  updateDoc,
  doc,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import db from '@/lib/firebase/firestore'

export type NotificationType = 'invite_declined'

export interface AppNotification {
  id: string
  type: NotificationType
  recipientUid: string
  actorName: string
  gameId: string
  read: boolean
  createdAt: unknown
}

export async function writeNotification(
  recipientUid: string,
  payload: Omit<AppNotification, 'id' | 'read' | 'createdAt'>
): Promise<void> {
  await addDoc(collection(db, 'users', recipientUid, 'notifications'), {
    ...payload,
    read: false,
    createdAt: serverTimestamp(),
  })
}

export function subscribeUnreadNotifications(
  uid: string,
  onChange: (notifs: AppNotification[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'users', uid, 'notifications'),
    where('read', '==', false)
  )
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppNotification))
  })
}

export async function markNotificationRead(uid: string, notifId: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'notifications', notifId), { read: true })
}
