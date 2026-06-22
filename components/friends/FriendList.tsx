'use client'

import { useState } from 'react'
import FriendCard from './FriendCard'
import type { Friendship, UserActiveGameStatus, GameStatus, GameMode } from '@/types'

interface FriendListProps {
  friendships: Friendship[]
  currentUid: string
  activeGames: Record<string, UserActiveGameStatus>
  onRemove: (friendshipId: string) => Promise<void>
  onWatch: (gameId: string) => void
}

export default function FriendList({
  friendships,
  currentUid,
  activeGames,
  onRemove,
  onWatch,
}: FriendListProps) {
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

        const status = activeGames[friendUid]
        const activeGame =
          status?.activeGameId && status.activeGameStatus !== 'game_finished'
            ? {
                gameId: status.activeGameId,
                status: status.activeGameStatus as GameStatus,
                gameMode: (status.activeGameMode ?? 'classic') as GameMode,
              }
            : null

        return (
          <FriendCard
            key={friendship.id}
            uid={friend.uid}
            displayName={friend.displayName}
            username={friend.username}
            photoURL={friend.photoURL}
            activeGame={activeGame}
            onWatch={onWatch}
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
