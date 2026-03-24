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

  const totalGames = finishedGames.length
  const wins       = finishedGames.filter((g) => g.winnerId === user.uid).length
  const bestScore  = totalGames > 0
    ? Math.max(...finishedGames.map((g) => g.players.find((p) => p.uid === user.uid)?.totalScore ?? 0))
    : 0
  const winRate    = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0

  return (
    <>
      <TopBar title="Előzmények" showBack backHref="/dashboard" />

      <div className="px-4 py-5 flex flex-col gap-5 max-w-lg mx-auto">

        {/* Stats */}
        {!loading && totalGames > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-0.5">
              Statisztika
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Játék',     value: totalGames,      sub: null },
                { label: 'Győzelem',  value: wins,            sub: null },
                { label: 'Win %',     value: `${winRate}%`,   sub: null },
                { label: 'Legjobb',   value: bestScore,       sub: 'p'  },
              ].map(({ label, value, sub }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-border bg-surface px-2 py-3 text-center card-shadow"
                >
                  <p className="text-lg font-bold tabular-nums text-foreground leading-tight">
                    {value}
                    {sub && <span className="text-xs font-normal text-muted-foreground ml-0.5">{sub}</span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Win rate bar */}
            <div className="rounded-2xl border border-border bg-surface px-4 py-3 card-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-foreground">Győzelmi arány</p>
                <p className="text-xs font-bold text-primary-600 dark:text-primary-400">{winRate}%</p>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary-500 transition-all duration-500"
                  style={{ width: `${winRate}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex flex-col gap-2.5">
          {!loading && totalGames > 0 && (
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-0.5">
              Befejezett játékok
            </p>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : finishedGames.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <span className="text-5xl">📋</span>
              <p className="font-semibold text-foreground">Még nincs befejezett játék</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A lejátszott játékaid<br />itt jelennek meg.
              </p>
            </div>
          ) : (
            finishedGames.map((game) => (
              <GameCard key={game.id} game={game} currentUid={user.uid} />
            ))
          )}
        </div>

      </div>
    </>
  )
}
