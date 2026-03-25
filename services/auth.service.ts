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
import { shouldUseRedirectAuth } from '@/lib/utils/device'
import type { UserProfile } from '@/types'

const googleProvider = new GoogleAuthProvider()
// Mindig mutasson account-választót, ne logoljon be csendben az utolsó fiókkal
googleProvider.setCustomParameters({ prompt: 'select_account' })

// ── Segédfüggvény: user profil létrehozása Firestore-ban ──────────────────────
async function createUserProfile(user: User): Promise<void> {
  const userRef  = doc(db, COLLECTIONS.USERS, user.uid)
  const existing = await getDoc(userRef)
  if (existing.exists()) return

  const profile: Omit<UserProfile, 'createdAt' | 'updatedAt'> & {
    createdAt: ReturnType<typeof serverTimestamp>
    updatedAt: ReturnType<typeof serverTimestamp>
  } = {
    uid:         user.uid,
    email:       user.email ?? '',
    displayName: user.displayName ?? 'Névtelen',
    username:    user.uid.slice(0, 12), // ideiglenes, profilban szerkeszthető
    photoURL:    user.photoURL ?? null,
    gamesPlayed: 0,
    gamesWon:    0,
    createdAt:   serverTimestamp(),
    updatedAt:   serverTimestamp(),
  }

  await setDoc(userRef, profile)
}

// ── Email + jelszó regisztráció ───────────────────────────────────────────────
export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<User> {
  const { user } = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(user, { displayName })
  await createUserProfile(user)
  // displayName frissítése a Firestore-ban is (updateProfile után van user.displayName)
  await setDoc(doc(db, COLLECTIONS.USERS, user.uid), { displayName }, { merge: true })
  return user
}

// ── Email + jelszó bejelentkezés ──────────────────────────────────────────────
export async function loginWithEmail(email: string, password: string): Promise<User> {
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  return user
}

// ── Google bejelentkezés ──────────────────────────────────────────────────────
// Mobilon / PWA-ban redirect, asztali böngészőn popup
export async function loginWithGoogle(): Promise<User | null> {
  if (shouldUseRedirectAuth()) {
    // signInWithRedirect inicializálja az átirányítást.
    // A függvény visszatér, de utána a böngésző azonnal navigál el
    // → a hívó oldalon a loading state marad, ne hívj setLoading(false)-t.
    await signInWithRedirect(auth, googleProvider)
    return null
  }

  try {
    const { user } = await signInWithPopup(auth, googleProvider)
    await createUserProfile(user)
    return user
  } catch (err: unknown) {
    // A user bezárta a popupot — nem valódi hiba
    const code = (err as { code?: string }).code
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return null
    }
    throw err
  }
}

// ── Google redirect eredmény feldolgozása ─────────────────────────────────────
// Ezt az AuthProvider-ben AWAIT-elni kell, MIELŐTT az onAuthStateChanged
// feliratkozik — különben race condition keletkezik (null user → login redirect).
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
