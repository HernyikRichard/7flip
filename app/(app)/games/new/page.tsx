'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useFriends } from '@/hooks/useFriends'
import { createGame } from '@/services/game.service'
import { GAME_MODE_LABELS, GAME_MODE_DESCRIPTIONS } from '@/lib/gameModes'
import TopBar from '@/components/layout/TopBar'
import PlayerSelector from '@/components/games/PlayerSelector'
import Button from '@/components/ui/Button'
import ErrorMessage from '@/components/ui/ErrorMessage'
import Avatar from '@/components/ui/Avatar'
import { ROUTES } from '@/lib/constants'
import type { FriendshipUser, GameMode } from '@/types'

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
        brutalMode: false,
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
      <div className="px-4 py-4 flex flex-col gap-6 max-w-lg mx-auto">

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Te</h2>
          <div className="flex items-center gap-3 rounded-2xl border border-primary-300 bg-primary-50 dark:bg-primary-950 px-4 py-3">
            <Avatar src={profile.photoURL} name={profile.displayName} size="sm" />
            <div>
              <p className="font-medium text-primary-700 dark:text-primary-300">{profile.displayName}</p>
              <p className="text-xs text-muted-foreground">@{profile.username}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Barátok {selectedPlayers.length > 0 && <span className="text-primary-600">({selectedPlayers.length})</span>}
          </h2>
          <PlayerSelector friends={friendsList} selected={selectedPlayers} onToggle={togglePlayer} />
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Játékmód</h2>
          <div className="grid grid-cols-2 gap-2">
            {(['classic', 'revenge'] as GameMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setGameMode(mode)}
                className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                  gameMode === mode
                    ? 'border-primary-400 bg-primary-50 dark:bg-primary-950'
                    : 'border-border bg-surface'
                }`}
              >
                <p className={`font-semibold text-sm ${gameMode === mode ? 'text-primary-700 dark:text-primary-300' : 'text-foreground'}`}>
                  {mode === 'classic' ? '🎯' : '💀'} {GAME_MODE_LABELS[mode]}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{GAME_MODE_DESCRIPTIONS[mode]}</p>
              </button>
            ))}
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
