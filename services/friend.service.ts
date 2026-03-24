import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import db from '@/lib/firebase/firestore'
import { COLLECTIONS } from '@/lib/constants'
import type { FriendRequest, Friendship, FriendshipUser } from '@/types'
import { getUserProfile } from './user.service'

// ── Barát kérés küldése ──────────────────────────────────────────────────────
export async function sendFriendRequest(
  fromUid: string,
  toUid: string
): Promise<void> {
  if (fromUid === toUid) throw new Error('SELF_REQUEST')

  // Duplikált kérés ellenőrzés
  const existing = await getDocs(
    query(
      collection(db, COLLECTIONS.FRIEND_REQUESTS),
      where('fromUid', '==', fromUid),
      where('toUid', '==', toUid),
      where('status', '==', 'pending')
    )
  )
  if (!existing.empty) throw new Error('ALREADY_SENT')

  // Fordított irányú aktív kérés?
  const reverse = await getDocs(
    query(
      collection(db, COLLECTIONS.FRIEND_REQUESTS),
      where('fromUid', '==', toUid),
      where('toUid', '==', fromUid),
      where('status', '==', 'pending')
    )
  )
  if (!reverse.empty) throw new Error('ALREADY_RECEIVED')

  // Már barátok?
  const friendship = await getDocs(
    query(
      collection(db, COLLECTIONS.FRIENDSHIPS),
      where('userIds', 'array-contains', fromUid)
    )
  )
  const alreadyFriends = friendship.docs.some((d) =>
    (d.data().userIds as string[]).includes(toUid)
  )
  if (alreadyFriends) throw new Error('ALREADY_FRIENDS')

  const fromProfile = await getUserProfile(fromUid)

  await addDoc(collection(db, COLLECTIONS.FRIEND_REQUESTS), {
    fromUid,
    toUid,
    fromDisplayName: fromProfile?.displayName ?? 'Névtelen',
    fromPhotoURL: fromProfile?.photoURL ?? null,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

// ── Kérés elfogadása → Friendship létrehozása ─────────────────────────────────
export async function acceptFriendRequest(requestId: string): Promise<void> {
  const requestRef = doc(db, COLLECTIONS.FRIEND_REQUESTS, requestId)

  const requestSnap = await getDoc(requestRef)
  if (!requestSnap.exists()) throw new Error('REQUEST_NOT_FOUND')
  const request = { id: requestSnap.id, ...requestSnap.data() } as FriendRequest

  const [fromProfile, toProfile] = await Promise.all([
    getUserProfile(request.fromUid),
    getUserProfile(request.toUid),
  ])

  const usersMap: Record<string, FriendshipUser> = {}

  if (fromProfile) {
    usersMap[request.fromUid] = {
      uid: fromProfile.uid,
      displayName: fromProfile.displayName,
      photoURL: fromProfile.photoURL,
      username: fromProfile.username,
    }
  }
  if (toProfile) {
    usersMap[request.toUid] = {
      uid: toProfile.uid,
      displayName: toProfile.displayName,
      photoURL: toProfile.photoURL,
      username: toProfile.username,
    }
  }

  await addDoc(collection(db, COLLECTIONS.FRIENDSHIPS), {
    userIds: [request.fromUid, request.toUid],
    users: usersMap,
    createdAt: serverTimestamp(),
  })

  await updateDoc(requestRef, {
    status: 'accepted',
    updatedAt: serverTimestamp(),
  })
}

// ── Kérés elutasítása ────────────────────────────────────────────────────────
export async function rejectFriendRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.FRIEND_REQUESTS, requestId), {
    status: 'rejected',
    updatedAt: serverTimestamp(),
  })
}

// ── Kérés visszavonása (küldő törli) ─────────────────────────────────────────
export async function cancelFriendRequest(requestId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.FRIEND_REQUESTS, requestId))
}

// ── Barátság törlése ─────────────────────────────────────────────────────────
export async function removeFriend(friendshipId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.FRIENDSHIPS, friendshipId))
}

// ── Real-time barátlista figyelés ────────────────────────────────────────────
export function subscribeFriendships(
  uid: string,
  onChange: (friendships: Friendship[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.FRIENDSHIPS),
    where('userIds', 'array-contains', uid)
  )
  return onSnapshot(q, (snap) => {
    const friendships = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Friendship[]
    onChange(friendships)
  })
}

// ── Real-time bejövő kérések figyelés ────────────────────────────────────────
export function subscribeIncomingRequests(
  uid: string,
  onChange: (requests: FriendRequest[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.FRIEND_REQUESTS),
    where('toUid', '==', uid),
    where('status', '==', 'pending')
  )
  return onSnapshot(q, (snap) => {
    const requests = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as FriendRequest[]
    onChange(requests)
  })
}

// ── Real-time kimenő kérések figyelés ────────────────────────────────────────
export function subscribeOutgoingRequests(
  uid: string,
  onChange: (requests: FriendRequest[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.FRIEND_REQUESTS),
    where('fromUid', '==', uid),
    where('status', '==', 'pending')
  )
  return onSnapshot(q, (snap) => {
    const requests = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as FriendRequest[]
    onChange(requests)
  })
}
