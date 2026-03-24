'use client'

import { useParams } from 'next/navigation'
import { useGameDetail } from '@/hooks/useGameDetail'
import { useAuth } from '@/hooks/useAuth'
import TopBar from '@/components/layout/TopBar'
import Avatar from '@/components/ui/Avatar'
import Spinner from '@/components/ui/Spinner'
import { toDate } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'
import { formatScoreBreakdown } from '@/lib/scoreEngine'

export default function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { game, currentRound, loading } = useGameDetail(id)

  if (!user) return null
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner size="lg" /></div>
  if (!game) return (
    <>
      <TopBar title="Napló" showBack backHref={ROUTES.HISTORY} />
      <div className="px-4 py-6 text-center text-muted-foreground">Játék nem található.</div>
    </>
  )

  const winner = game.players.find((p) => p.uid === game.winnerId)
  const sorted = [...game.players].sort((a, b) => b.totalScore - a.totalScore)

  return (
    <>
      <TopBar title="Játék napló" showBack backHref={ROUTES.HISTORY} />
      <div className="px-4 py-4 flex flex-col gap-6 max-w-lg mx-auto">

        {/* Fejléc */}
        <div className="rounded-2xl border border-border bg-surface p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{toDate(game.createdAt)?.toLocaleDateString('hu-HU') ?? ''}</span>
            <span>{game.roundCount} kör</span>
          </div>
          {winner && (
            <div className="text-center">
              <p className="text-3xl">🏆</p>
              <p className="font-bold text-foreground mt-1">{winner.displayName}</p>
              <p className="text-sm text-muted-foreground">{winner.totalScore} pont</p>
            </div>
          )}
        </div>

        {/* Végeredmény */}
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Végeredmény</h2>
          {sorted.map((player, i) => (
            <div key={player.uid} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
              player.uid === user.uid ? 'border-primary-300 bg-primary-50 dark:bg-primary-950/50' : 'border-border bg-surface'
            }`}>
              <span className="w-6 text-center font-bold text-sm text-muted-foreground">
                {i === 0 ? '🏆' : `#${i + 1}`}
              </span>
              <Avatar src={player.photoURL} name={player.displayName} size="sm" />
              <span className="flex-1 font-medium text-foreground">{player.displayName}</span>
              <div className="text-right">
                <p className="font-bold text-foreground">{player.totalScore}</p>
                <p className="text-xs text-muted-foreground">pont · {player.roundsPlayed} kör</p>
              </div>
            </div>
          ))}
        </div>

        {/* Utolsó kör breakdown (ha elérhető) */}
        {currentRound && (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Utolsó kör részletezése
            </h2>
            <div className="rounded-2xl border border-border bg-surface divide-y divide-border overflow-hidden">
              {Object.values(currentRound.playerStates).map((state) => {
                const player = game.players.find((p) => p.uid === state.uid)
                return (
                  <div key={state.uid} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{player?.displayName ?? state.uid}</span>
                      <span className="font-bold text-foreground">{state.roundScore ?? '–'} pont</span>
                    </div>
                    {state.scoreBreakdown && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatScoreBreakdown(state.scoreBreakdown)}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </>
  )
}
