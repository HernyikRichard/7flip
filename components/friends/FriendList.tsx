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
    try {
      await onRemove(friendshipId)
    } finally {
      setRemovingId(null)
    }
  }

  if (friendships.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface px-4 py-8 text-center">
        <p className="text-muted-foreground">Még nincsenek barátaid.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Keress rá valakire felhasználónév alapján!
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {friendships.map((friendship) => {
        // A másik user adatai
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
