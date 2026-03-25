'use client'

import { useState } from 'react'
import FriendCard from './FriendCard'
import type { Friendship } from '@/types'

interface FriendListProps {
  friendships: Friendship[]
  currentUid: string
  onRemove: (friendshipId: string) => Promise<void>
}

export default function FriendList({ friendships, currentUid, onRemove }: FriendListProps) {
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function handleRemove(friendshipId: string) {
    setRemovingId(friendshipId)
    try { await onRemove(friendshipId) }
    finally { setRemovingId(null) }
  }

  if (friendships.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="text-4xl">👥</span>
        <p className="font-semibold text-foreground">Még nincsenek barátaid</p>
        <p className="text-sm text-muted-foreground">Keress rá valakire felhasználónév alapján!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {friendships.map((friendship) => {
        const friendUid = friendship.userIds.find((id) => id !== currentUid)!
        const friend = friendship.users[friendUid]
        if (!friend) return null
        return (
          <FriendCard
            key={friendship.id}
            uid={friend.uid}
            displayName={friend.displayName}
            username={friend.username}
            photoURL={friend.photoURL}
            secondaryAction={{
              label: 'Eltávolít',
              variant: 'ghost',
              loading: removingId === friendship.id,
              onClick: () => handleRemove(friendship.id),
            }}
          />
        )
      })}
    </div>
  )
}
