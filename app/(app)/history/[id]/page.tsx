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
import { cn } from '@/lib/utils'

const MODE_BADGE: Record<string, string> = {
  classic: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  revenge: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  brutal:  'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
}

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
        <div className="px-4 py-20 text-center text-muted-foreground">Játék nem található.</div>
      </>
    )
  }

  const winner      = game.players.find((p) => p.uid === game.winnerId)
  const finishedDate = toDate(game.finishedAt)
  const mode        = game.gameMode ?? 'classic'

  return (
    <>
      <TopBar title="Játék részletei" showBack backHref={ROUTES.HISTORY} />

      <div className="px-4 py-5 flex flex-col gap-5 max-w-lg mx-auto">

        {/* Győztes banner */}
        {winner && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/[0.08] border border-amber-200 dark:border-amber-500/30 p-5 flex flex-col items-center gap-2.5 text-center card-shadow">
            <span className="text-4xl">🏆</span>
            <div>
              <p className="text-lg font-bold text-amber-800 dark:text-amber-200">{winner.displayName} nyerte!</p>
              <p className="text-sm text-amber-600 dark:text-amber-400/80 mt-0.5">
                {winner.totalScore} pont · {game.roundCount} kör · {game.players.length} játékos
              </p>
              {game.gameMode && (
                <span className={cn('inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full mt-2', MODE_BADGE[mode])}>
                  {GAME_MODE_META[mode].label}
                </span>
              )}
            </div>
            {finishedDate && (
              <p className="text-xs text-amber-500">
                {finishedDate.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
          </div>
        )}

        {/* Végeredmény */}
        <section className="flex flex-col gap-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-0.5">Végeredmény</p>
          <HistoryScoreboard
            players={game.players}
            winnerId={game.winnerId}
            targetScore={game.targetScore}
            currentUid={user?.uid}
          />
        </section>

        {/* Grafikon */}
        {rounds.length > 1 && (
          <section className="flex flex-col gap-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-0.5">Pontszám alakulása</p>
            <div className="rounded-2xl border border-border bg-surface p-4 card-shadow">
              <HistoryScoreChart rounds={rounds} players={game.players} targetScore={game.targetScore} />
            </div>
          </section>
        )}

        {/* Körönkénti bontás */}
        {rounds.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-0.5">
              Körönkénti bontás · {rounds.length} kör
            </p>
            <HistoryRoundBreakdown rounds={rounds} players={game.players} />
          </section>
        )}

      </div>
    </>
  )
}
