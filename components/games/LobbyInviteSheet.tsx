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
  const [busy, setBusy] = useState(false)
  const [mounted, setMounted] = useState(false)

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
      setBusy(false) }
  }

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 1.5rem',
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-3xl border border-border w-full max-w-sm flex flex-col gap-4 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fejléc */}
        <div className="flex items-center justify-between">
          <p className="font-bold text-foreground text-lg">
            Meghívás{selected.length > 0 && <span className="text-primary-600 ml-1">({selected.length})</span>}
          </p>
          <button
            onClick={onClose}
            className="rounded-xl bg-muted px-3 py-1.5 text-sm text-muted-foreground hover:bg-border transition-colors"
          >
            Mégse
          </button>
        </div>

        {/* Barátok listája */}
        <div className="max-h-64 overflow-y-auto">
          <PlayerSelector friends={availableFriends ?? []} selected={selected} onToggle={toggle} />
        </div>

        {/* Gomb */}
        <Button fullWidth size="lg" onClick={handleInvite} loading={busy} disabled={selected.length === 0}>
          Meghívás
        </Button>
      </div>
    </div>,
    document.body
  )
}
