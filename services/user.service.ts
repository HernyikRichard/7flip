import {
  doc,
  getDoc,
  updateDoc,
  query,
  collection,
  where,
  getDocs,
  limit,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore'
import db from '@/lib/firebase/firestore'
import { COLLECTIONS } from '@/lib/constants'
import { isValidUsername } from '@/lib/utils'
import type { UserProfile, UpdateUserProfileData } from '@/types'

// ── Profil lekérése ──────────────────────────────────────────────────────────
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid))
  if (!snap.exists()) return null
  return snap.data() as UserProfile
}

// ── Username elérhetőség ellenőrzés ─────────────────────────────────────────
export async function isUsernameAvailable(
  username: string,
  currentUid: string
): Promise<boolean> {
  if (!isValidUsername(username)) return false

  const q = query(
    collection(db, COLLECTIONS.USERS),
    where('username', '==', username),
    limit(1)
  )
  const snap = await getDocs(q)

  if (snap.empty) return true

  // Ha az egyetlen találat a saját user → szabad (nem változott)
  return snap.docs[0].id === currentUid
}

// ── Profil frissítése (displayName + username) ────────────────────────────────
// Username változáskor transaction-t használunk a race condition ellen
export async function updateUserProfile(
  uid: string,
  data: UpdateUserProfileData
): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, uid)

  if (data.username) {
    // Transaction: username foglalás atomilag
    await runTransaction(db, async (tx) => {
      // Ellenőrzés a transaction-on belül
      const q = query(
        collection(db, COLLECTIONS.USERS),
        where('username', '==', data.username),
        limit(1)
      )
      const snap = await getDocs(q)
      const alreadyTaken = !snap.empty && snap.docs[0].id !== uid

      if (alreadyTaken) {
        throw new Error('USERNAME_TAKEN')
      }

      tx.update(userRef, {
        ...data,
        updatedAt: serverTimestamp(),
      })
    })
  } else {
    // Nincs username változás → egyszerű update
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    })
  }
}

// ── Felhasználók keresése username alapján (barát kereséshez) ─────────────────
export async function searchUsersByUsername(
  searchTerm: string,
  currentUid: string,
  maxResults = 10
): Promise<UserProfile[]> {
  if (searchTerm.length < 2) return []

  // Firestore prefix-keresés: "term" → "term\uf8ff" range query
  const q = query(
    collection(db, COLLECTIONS.USERS),
    where('username', '>=', searchTerm.toLowerCase()),
    where('username', '<=', searchTerm.toLowerCase() + '\uf8ff'),
    limit(maxResults)
  )
  const snap = await getDocs(q)

  return snap.docs
    .map((d) => d.data() as UserProfile)
    .filter((u) => u.uid !== currentUid) // saját magát ne mutassa
}
