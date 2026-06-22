import { Timestamp } from 'firebase/firestore'
import type { GameStatus } from './game.types'
import type { GameMode } from './gameMode.types'

export interface UserActiveGameStatus {
  activeGameId: string | null
  activeGameStatus: GameStatus | null
  activeGameMode: GameMode | null
  updatedAt?: Timestamp
}

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

// Profil frissítéshez — csak a módosítható mezők
export type UpdateUserProfileData = Partial<Pick<UserProfile, 'displayName' | 'username' | 'photoURL'>>
