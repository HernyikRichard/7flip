'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useGames } from '@/hooks/useGames'
import TopBar from '@/components/layout/TopBar'
import GameCard from '@/components/games/GameCard'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { ROUTES } from '@/lib/constants'

export default function GamesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { activeGames, loading } = useGames()

  if (!user) return null

  return (
    <>
      <TopBar
        title="Játékok"
        right={
          <button
            onClick={() => router.push(ROUTES.GAMES_NEW)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-primary-600 hover:bg-muted text-xl font-bold"
            aria-label="Új játék"
          >
            +
          </button>
        }
      />

      <div className="px-4 py-4 flex flex-col gap-4 max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : activeGames.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-4xl">🎮</p>
            <p className="font-semibold text-foreground">Nincs aktív játék</p>
            <p className="text-sm text-muted-foreground">Indíts egy új játékot a barátaiddal!</p>
            <Button onClick={() => router.push(ROUTES.GAMES_NEW)}>
              + Új játék indítása
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {activeGames.map((game) => (
              <GameCard key={game.id} game={game} currentUid={user.uid} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
