import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import auth from '@/lib/firebase/auth'
import db from '@/lib/firebase/firestore'
import { COLLECTIONS } from '@/lib/constants'
import type { UserProfile } from '@/types'

const googleProvider = new GoogleAuthProvider()

// ── Segédfüggvény: user profil létrehozása Firestore-ban ──────────────────────
async function createUserProfile(user: User, username?: string): Promise<void> {
  const userRef = doc(db, COLLECTIONS.USERS, user.uid)
  const existing = await getDoc(userRef)

  // Ha már van profil (pl. Google login ismételt esetén), ne írjuk felül
  if (existing.exists()) return

  const profile: Omit<UserProfile, 'createdAt' | 'updatedAt'> & {
    createdAt: ReturnType<typeof serverTimestamp>
    updatedAt: ReturnType<typeof serverTimestamp>
  } = {
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName ?? username ?? 'Névtelen',
    username: username ?? user.uid.slice(0, 12), // ideiglenes username, profilban szerkeszthető
    photoURL: user.photoURL ?? null,
    gamesPlayed: 0,
    gamesWon: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(userRef, profile)
}

// ── Email + jelszó regisztráció ───────────────────────────────────────────────
export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const { user } = await createUserWithEmailAndPassword(auth, email, password)

  // Firebase Auth displayName frissítése
  await updateProfile(user, { displayName })

  // Firestore profil létrehozása
  await createUserProfile(user, undefined)

  // displayName frissítése a Firestore-ban is (updateProfile után van user.displayName)
  const userRef = doc(db, COLLECTIONS.USERS, user.uid)
  await setDoc(userRef, { displayName }, { merge: true })

  return user
}

// ── Email + jelszó bejelentkezés ──────────────────────────────────────────────
export async function loginWithEmail(email: string, password: string): Promise<User> {
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  return user
}

// ── Google bejelentkezés ──────────────────────────────────────────────────────
// Mobilon redirect-et használunk, desktopOn popup-ot
export async function loginWithGoogle(): Promise<User | null> {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(
    typeof navigator !== 'undefined' ? navigator.userAgent : ''
  )

  if (isMobile) {
    await signInWithRedirect(auth, googleProvider)
    return null // redirect esetén az oldal újratöltődik
  }

  const { user } = await signInWithPopup(auth, googleProvider)
  await createUserProfile(user)
  return user
}

// ── Google redirect eredmény feldolgozása (app betöltéskor hívandó) ───────────
export async function handleGoogleRedirectResult(): Promise<User | null> {
  const result = await getRedirectResult(auth)
  if (result?.user) {
    await createUserProfile(result.user)
    return result.user
  }
  return null
}

// ── Kijelentkezés ─────────────────────────────────────────────────────────────
export async function logout(): Promise<void> {
  await signOut(auth)
}
