import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
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
    username:    user.uid.slice(0, 12),
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
  await setDoc(doc(db, COLLECTIONS.USERS, user.uid), { displayName }, { merge: true })
  return user
}

// ── Email + jelszó bejelentkezés ──────────────────────────────────────────────
export async function loginWithEmail(email: string, password: string): Promise<User> {
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  return user
}

// ── Google bejelentkezés ──────────────────────────────────────────────────────
// Kizárólag signInWithPopup — a signInWithRedirect megbízhatatlan modern
// mobilböngészőkben (iOS Safari ITP + Chrome Privacy Sandbox cross-origin
// cookie-okat blokkol, emiatt getRedirectResult() null-t ad vissza).
export async function loginWithGoogle(): Promise<User | null> {
  try {
    const { user } = await signInWithPopup(auth, googleProvider)
    await createUserProfile(user)
    return user
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    // User bezárta a popup-ot — nem hiba, csak visszavonás
    if (
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request'
    ) {
      return null
    }
    throw err
  }
}

// ── Kijelentkezés ─────────────────────────────────────────────────────────────
export async function logout(): Promise<void> {
  await signOut(auth)
}
