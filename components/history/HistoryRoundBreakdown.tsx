'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatScoreBreakdown } from '@/lib/scoreEngine'
import { PLAYER_STATUS_LABELS } from '@/lib/gameConstants'
import type { Round, GamePlayer } from '@/types'
import type { ModifierCard } from '@/types/card.types'

interface Props {
  rounds: Round[]
  players: GamePlayer[]
}

function statusStyle(status: string): string {
  if (status === 'busted')
    return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
  if (status === 'flip7')
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
  return 'bg-muted text-muted-foreground'
}

export default function HistoryRoundBreakdown({ rounds, players }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber)

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((round) => {
        const isOpen = expanded === round.id

        const roundPlayers = players
          .map((p) => ({ player: p, state: round.playerStates[p.uid] }))
          .filter(({ state }) => !!state)
          .sort((a, b) => (b.state.roundScore ?? 0) - (a.state.roundScore ?? 0))

        const topScore = roundPlayers[0]?.state.roundScore ?? 0

        return (
          <div key={round.id} className="rounded-2xl border border-border bg-surface overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : round.id)}
              className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted transition-colors text-left"
            >
              <span className="text-sm font-semibold text-foreground w-14 shrink-0">
                {round.roundNumber}. kör
              </span>

              <div className="flex-1 flex gap-1.5 overflow-x-auto scrollbar-hide">
                {roundPlayers.slice(0, 4).map(({ player, state }) => (
                  <span
                    key={player.uid}
                    className={cn(
                      'shrink-0 text-xs px-2 py-0.5 rounded-full',
                      state.roundScore === topScore && topScore > 0
                        ? 'bg-primary-100 text-primary-700 font-semibold dark:bg-primary-950 dark:text-primary-300'
                        : statusStyle(state.status)
                    )}
                  >
                    {player.displayName.split(' ')[0]}: {state.roundScore ?? 0}
                  </span>
                ))}
              </div>

              <ChevronDown
                size={16}
                className={cn('text-muted-foreground shrink-0 transition-transform duration-200', isOpen && 'rotate-180')}
              />
            </button>

            {isOpen && (
              <div className="border-t border-border divide-y divide-border">
                {roundPlayers.map(({ player, state }) => (
                  <div key={player.uid} className="px-4 py-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{player.displayName}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full', statusStyle(state.status))}>
                          {PLAYER_STATUS_LABELS[state.status]}
                        </span>
                        <p className="text-sm font-bold text-foreground">{state.roundScore ?? 0} p</p>
                      </div>
                    </div>

                    {/* Kártyák */}
                    {((state.numberCards?.length ?? 0) > 0 || (state.modifierCards?.length ?? 0) > 0) && (
                      <div className="flex flex-wrap gap-1.5">
                        {(state.numberCards ?? []).map((n, i) => (
                          <span
                            key={i}
                            className="rounded-lg border border-border bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground"
                          >
                            {n}
                          </span>
                        ))}
                        {(state.modifierCards ?? []).map((m: ModifierCard, i) => (
                          <span
                            key={i}
                            className={cn(
                              'rounded-lg border px-2 py-0.5 text-xs font-semibold',
                              m.modifierType === 'divide2'
                                ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300'
                                : 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                            )}
                          >
                            {m.modifierType === 'divide2' ? '÷2' : `-${m.minusValue}`}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Pontszám levezetés */}
                    {state.scoreBreakdown && (
                      <p className="text-xs text-muted-foreground">
                        {formatScoreBreakdown(state.scoreBreakdown)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
