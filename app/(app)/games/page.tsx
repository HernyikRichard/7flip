'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useGames } from '@/hooks/useGames'
import TopBar from '@/components/layout/TopBar'
import GameCard from '@/components/games/GameCard'
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
            className="flex h-9 w-9 items-center justify-center rounded-xl text-primary-500 hover:bg-muted text-2xl font-bold transition-colors active:scale-90"
            aria-label="Új játék"
          >
            +
          </button>
        }
      />

      <div className="px-4 py-5 flex flex-col gap-3 max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : activeGames.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <span className="text-5xl">🎮</span>
            <p className="font-semibold text-foreground">Nincs aktív játék</p>
            <p className="text-sm text-muted-foreground">Indíts egy új játékot a barátaiddal!</p>
            <button
              onClick={() => router.push(ROUTES.GAMES_NEW)}
              className="mt-1 rounded-2xl bg-primary-500 hover:bg-primary-600 active:scale-[0.98] transition-all px-6 py-3 text-sm font-bold text-white shadow-md shadow-primary-500/20"
            >
              + Új játék indítása
            </button>
          </div>
        ) : (
          activeGames.map((game) => (
            <GameCard key={game.id} game={game} currentUid={user.uid} />
          ))
        )}
      </div>
    </>
  )
}
