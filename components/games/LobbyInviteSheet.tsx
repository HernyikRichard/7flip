'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/hooks/useAuth'
import { invitePlayersToGame } from '@/services/game.service'
import PlayerSelector from '@/components/games/PlayerSelector'
import Button from '@/components/ui/Button'
import type { FriendshipUser, Game } from '@/types'

interface LobbyInviteSheetProps {
  game: Game
  availableFriends: FriendshipUser[]
  onClose: () => void
}

export default function LobbyInviteSheet({ game, availableFriends, onClose }: LobbyInviteSheetProps) {
  const { user } = useAuth()
  const [selected, setSelected] = useState<FriendshipUser[]>([])
  const [busy, setBusy]         = useState(false)
  const [mounted, setMounted]   = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!user || !mounted) return null

  function toggle(friend: FriendshipUser) {
    setSelected((prev) =>
      prev.some((p) => p.uid === friend.uid)
        ? prev.filter((p) => p.uid !== friend.uid)
        : [...prev, friend]
    )
  }

  async function handleInvite() {
    if (selected.length === 0) return
    setBusy(true)
    try {
      await invitePlayersToGame(
        game.id,
        selected.map((p) => ({ uid: p.uid, displayName: p.displayName, photoURL: p.photoURL ?? null }))
      )
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-5 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-3xl border border-border w-full max-w-sm flex flex-col gap-4 p-6 card-shadow-md animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-bold text-foreground text-[17px]">
            Meghívás
            {selected.length > 0 && (
              <span className="text-primary-500 ml-1.5">({selected.length})</span>
            )}
          </p>
          <button
            onClick={onClose}
            className="rounded-xl bg-muted px-3.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
          >
            Mégse
          </button>
        </div>

        <div className="max-h-64 overflow-y-auto">
          <PlayerSelector friends={availableFriends ?? []} selected={selected} onToggle={toggle} />
        </div>

        <Button fullWidth size="lg" onClick={handleInvite} loading={busy} disabled={selected.length === 0}>
          Meghívás
        </Button>
      </div>
    </div>,
    document.body
  )
}
