import { Timestamp } from 'firebase/firestore'

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected'

export interface FriendRequest {
  id: string
  fromUid: string
  toUid: string
  fromDisplayName: string   // denormalizált gyors megjelenítéshez
  fromPhotoURL: string | null
  status: FriendRequestStatus
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface FriendshipUser {
  uid: string
  displayName: string
  photoURL: string | null
  username: string
}

export interface Friendship {
  id: string
  userIds: [string, string]
  users: Record<string, FriendshipUser>   // uid → user adatok
  createdAt: Timestamp
}
