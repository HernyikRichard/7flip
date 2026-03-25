'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useFriends } from '@/hooks/useFriends'
import { createGame } from '@/services/game.service'
import { GAME_MODE_META } from '@/lib/game-modes'
import TopBar from '@/components/layout/TopBar'
import PlayerSelector from '@/components/games/PlayerSelector'
import Button from '@/components/ui/Button'
import ErrorMessage from '@/components/ui/ErrorMessage'
import Avatar from '@/components/ui/Avatar'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { FriendshipUser, GameMode } from '@/types'

const MODE_ACTIVE: Record<string, { border: string; bg: string; text: string }> = {
  classic: { border: 'border-blue-400',   bg: 'bg-blue-500/[0.06]',   text: 'text-blue-600 dark:text-blue-400'     },
  revenge: { border: 'border-red-400',    bg: 'bg-red-500/[0.06]',    text: 'text-red-600 dark:text-red-400'       },
  brutal:  { border: 'border-orange-400', bg: 'bg-orange-500/[0.06]', text: 'text-orange-600 dark:text-orange-400' },
}

export default function NewGamePage() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const { friendships } = useFriends()

  const [selectedPlayers, setSelectedPlayers] = useState<FriendshipUser[]>([])
  const [gameMode, setGameMode] = useState<GameMode>('classic')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const friendsList: FriendshipUser[] = (friendships ?? [])
    .flatMap((f) => {
      if (!f?.userIds || !f?.users) return []
      const friendUid = f.userIds.find((id) => id !== user?.uid)
      if (!friendUid) return []
      const u = f.users[friendUid]
      return u ? [u] : []
    })

  function togglePlayer(friend: FriendshipUser) {
    setSelectedPlayers((prev) =>
      prev.some((p) => p.uid === friend.uid)
        ? prev.filter((p) => p.uid !== friend.uid)
        : [...prev, friend]
    )
  }

  async function handleCreate() {
    if (!user || !profile) return
    setError(null)
    setCreating(true)
    try {
      const self: FriendshipUser = {
        uid: user.uid,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
        username: profile.username,
      }
      const allPlayers = [self, ...selectedPlayers]
      const gameId = await createGame({
        createdBy: user.uid,
        players: allPlayers.map((p) => ({
          uid: p.uid,
          displayName: p.displayName,
          photoURL: p.photoURL ?? null,
          totalScore: 0,
          roundsPlayed: 0,
          inviteStatus: p.uid === user.uid ? 'accepted' : 'pending',
        })),
        playerUids: allPlayers.map((p) => p.uid),
        gameMode,
      })
      router.push(`/games/${gameId}`)
    } catch (err) {
      console.error(err)
      setError('Nem sikerült létrehozni a játékot.')
    } finally {
      setCreating(false)
    }
  }

  if (!user || !profile) return null

  return (
    <>
      <TopBar title="Új játék" showBack backHref={ROUTES.GAMES} />
      <div className="px-4 py-5 flex flex-col gap-5 max-w-lg mx-auto">

        {/* Te */}
        <div className="flex flex-col gap-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-0.5">Te</p>
          <div className="flex items-center gap-3 rounded-2xl border-2 border-primary-400/50 bg-primary-500/[0.06] px-4 py-3">
            <Avatar src={profile.photoURL} name={profile.displayName} size="sm" />
            <div>
              <p className="font-semibold text-[15px] text-primary-700 dark:text-primary-300">{profile.displayName}</p>
              <p className="text-xs text-muted-foreground">@{profile.username}</p>
            </div>
          </div>
        </div>

        {/* Barátok */}
        <div className="flex flex-col gap-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-0.5">
            Barátok
            {selectedPlayers.length > 0 && (
              <span className="ml-2 text-primary-500">{selectedPlayers.length} kiválasztva</span>
            )}
          </p>
          <PlayerSelector friends={friendsList} selected={selectedPlayers} onToggle={togglePlayer} />
        </div>

        {/* Játékmód */}
        <div className="flex flex-col gap-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-0.5">Játékmód</p>
          <div className="flex flex-col gap-2">
            {Object.values(GAME_MODE_META).filter((m) => m.available).map((meta) => {
              const active = MODE_ACTIVE[meta.mode] ?? MODE_ACTIVE.classic
              const isActive = gameMode === meta.mode
              return (
                <button
                  key={meta.mode}
                  type="button"
                  onClick={() => setGameMode(meta.mode)}
                  className={cn(
                    'rounded-2xl border-2 px-4 py-3.5 text-left transition-all active:scale-[0.98]',
                    isActive ? `${active.border} ${active.bg}` : 'border-border bg-surface'
                  )}
                >
                  <p className={cn('font-semibold text-sm', isActive ? active.text : 'text-foreground')}>
                    {meta.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
                </button>
              )
            })}
          </div>
        </div>

        <ErrorMessage message={error} />

        <Button fullWidth size="lg" loading={creating} onClick={handleCreate}>
          Játék indítása ({1 + selectedPlayers.length} játékos)
        </Button>
      </div>
    </>
  )
}
