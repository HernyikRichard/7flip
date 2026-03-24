'use client'

import { useAuth } from '@/hooks/useAuth'
import { useGames } from '@/hooks/useGames'
import TopBar from '@/components/layout/TopBar'
import GameCard from '@/components/games/GameCard'
import Spinner from '@/components/ui/Spinner'

export default function HistoryPage() {
  const { user } = useAuth()
  const { finishedGames, loading } = useGames()

  if (!user) return null

  const wins = finishedGames.filter((g) => g.winnerId === user.uid).length
  const totalGames = finishedGames.length
  const bestScore = totalGames > 0
    ? Math.max(...finishedGames.map((g) => g.players.find((p) => p.uid === user.uid)?.totalScore ?? 0))
    : 0

  return (
    <>
      <TopBar title="Előzmények" />

      <div className="px-4 py-4 flex flex-col gap-4 max-w-lg mx-auto">
        {!loading && totalGames > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Játék', value: totalGames },
              { label: 'Győzelem', value: wins },
              { label: 'Legjobb', value: `${bestScore} p` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl border border-border bg-surface px-3 py-3 text-center">
                <p className="text-lg font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : finishedGames.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-4xl">📋</p>
            <p className="font-semibold text-foreground">Még nincs befejezett játék</p>
            <p className="text-sm text-muted-foreground">A lejátszott játékaid itt jelennek meg.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {finishedGames.map((game) => (
              <GameCard key={game.id} game={game} currentUid={user.uid} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
