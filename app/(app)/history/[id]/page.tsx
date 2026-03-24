'use client'

import { useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useGameHistory } from '@/hooks/useGameHistory'
import TopBar from '@/components/layout/TopBar'
import Spinner from '@/components/ui/Spinner'
import HistoryScoreboard from '@/components/history/HistoryScoreboard'
import HistoryScoreChart from '@/components/history/HistoryScoreChart'
import HistoryRoundBreakdown from '@/components/history/HistoryRoundBreakdown'
import { toDate } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'
import { GAME_MODE_META } from '@/lib/game-modes'

export default function GameHistoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { game, rounds, loading } = useGameHistory(id)

  if (loading) {
    return (
      <>
        <TopBar title="Játék részletei" showBack backHref={ROUTES.HISTORY} />
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      </>
    )
  }

  if (!game) {
    return (
      <>
        <TopBar title="Játék részletei" showBack backHref={ROUTES.HISTORY} />
        <div className="px-4 py-16 text-center text-muted-foreground">Játék nem található.</div>
      </>
    )
  }

  const winner = game.players.find((p) => p.uid === game.winnerId)
  const finishedDate = toDate(game.finishedAt)

  return (
    <>
      <TopBar title="Játék részletei" showBack backHref={ROUTES.HISTORY} />

      <div className="px-4 py-4 flex flex-col gap-6 max-w-lg mx-auto">

        {/* Győztes banner */}
        {winner && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-5 flex flex-col items-center gap-2 text-center">
            <span className="text-4xl">🏆</span>
            <div>
              <p className="text-lg font-bold text-amber-800 dark:text-amber-200">{winner.displayName} nyerte!</p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                {winner.totalScore} pont · {game.roundCount} kör · {game.players.length} játékos
              </p>
              {game.gameMode && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  game.gameMode === 'brutal'
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                    : game.gameMode === 'revenge'
                    ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                    : 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                }`}>
                  {GAME_MODE_META[game.gameMode ?? 'classic'].label}
                </span>
              )}
            </div>
            {finishedDate && (
              <p className="text-xs text-amber-500 dark:text-amber-500">
                {finishedDate.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
          </div>
        )}

        {/* Végeredmény */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Végeredmény</h2>
          <HistoryScoreboard
            players={game.players}
            winnerId={game.winnerId}
            targetScore={game.targetScore}
            currentUid={user?.uid}
          />
        </section>

        {/* Pontszám grafikon */}
        {rounds.length > 1 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pontszám alakulása</h2>
            <div className="rounded-2xl border border-border bg-surface p-4">
              <HistoryScoreChart rounds={rounds} players={game.players} targetScore={game.targetScore} />
            </div>
          </section>
        )}

        {/* Körönkénti bontás */}
        {rounds.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Körönkénti bontás · {rounds.length} kör
            </h2>
            <HistoryRoundBreakdown rounds={rounds} players={game.players} />
          </section>
        )}

      </div>
    </>
  )
}
