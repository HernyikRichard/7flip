import { Timestamp } from 'firebase/firestore'

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  username: string         // egyedi, kereshető azonosító
  photoURL: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
  gamesPlayed: number
  gamesWon: number
}

// Firestore dokumentum létrehozásához — uid és timestamp nélkül
export type CreateUserProfileData = Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>

// Profil frissítéshez — csak a módosítható mezők
export type UpdateUserProfileData = Partial<Pick<UserProfile, 'displayName' | 'username' | 'photoURL'>>
