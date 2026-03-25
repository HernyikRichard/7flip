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
  if (status === 'busted') return 'bg-red-500/10 text-red-600 dark:text-red-400'
  if (status === 'flip7')  return 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
  if (status === 'frozen') return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
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
          <div key={round.id} className="rounded-2xl border border-border bg-surface overflow-hidden card-shadow">
            <button
              onClick={() => setExpanded(isOpen ? null : round.id)}
              className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-muted transition-colors text-left"
            >
              <span className="text-sm font-bold text-foreground w-14 shrink-0 tabular-nums">
                {round.roundNumber}. kör
              </span>

              <div className="flex-1 flex gap-1.5 overflow-x-auto scrollbar-hide">
                {roundPlayers.slice(0, 4).map(({ player, state }) => (
                  <span
                    key={player.uid}
                    className={cn(
                      'shrink-0 text-xs px-2 py-0.5 rounded-full font-medium',
                      state.roundScore === topScore && topScore > 0
                        ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 font-semibold'
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
                        <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', statusStyle(state.status))}>
                          {PLAYER_STATUS_LABELS[state.status]}
                        </span>
                        <p className="text-sm font-bold text-foreground tabular-nums">
                          {state.roundScore ?? 0}<span className="text-xs font-normal text-muted-foreground ml-0.5">p</span>
                        </p>
                      </div>
                    </div>

                    {((state.numberCards?.length ?? 0) > 0 || (state.modifierCards?.length ?? 0) > 0) && (
                      <div className="flex flex-wrap gap-1.5">
                        {(state.numberCards ?? []).map((n, i) => (
                          <span key={i} className="card-chip text-xs">
                            {n}
                          </span>
                        ))}
                        {(state.modifierCards ?? []).map((m: ModifierCard, i) => (
                          <span
                            key={i}
                            className={cn(
                              'inline-flex items-center justify-center rounded-lg border px-2 py-0.5 text-xs font-semibold',
                              m.modifierType === 'divide2' ? 'bg-purple-500/10 text-purple-700 border-purple-400/40 dark:text-purple-300' :
                              m.modifierType === 'x2'      ? 'bg-indigo-500/10 text-indigo-700 border-indigo-400/40 dark:text-indigo-300'  :
                              m.modifierType === 'plus'    ? 'bg-emerald-500/10 text-emerald-700 border-emerald-400/40 dark:text-emerald-300' :
                                                             'bg-orange-500/10 text-orange-700 border-orange-400/40 dark:text-orange-300'
                            )}
                          >
                            {m.modifierType === 'divide2' ? '÷2'
                              : m.modifierType === 'x2' ? '×2'
                              : m.modifierType === 'plus' ? `+${m.value ?? m.minusValue ?? ''}`
                              : `-${m.value ?? m.minusValue}`}
                          </span>
                        ))}
                      </div>
                    )}

                    {state.scoreBreakdown && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
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
