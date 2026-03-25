'use client'

import Avatar from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import type { GamePlayer } from '@/types'

interface Props {
  players: GamePlayer[]
  winnerId: string | null
  targetScore: number
  currentUid?: string
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function HistoryScoreboard({ players, winnerId, targetScore, currentUid }: Props) {
  const sorted = [...players].sort((a, b) => b.totalScore - a.totalScore)

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((player, rank) => {
        const isWinner = player.uid === winnerId
        const isMe     = player.uid === currentUid
        const pct      = Math.min(Math.round((player.totalScore / targetScore) * 100), 100)

        return (
          <div
            key={player.uid}
            className={cn(
              'flex items-center gap-3 rounded-2xl border-2 p-3.5 card-shadow',
              isWinner
                ? 'border-amber-400/50 bg-amber-500/[0.06] dark:bg-amber-500/[0.06]'
                : isMe
                  ? 'border-primary-400/50 bg-primary-500/[0.06]'
                  : 'border-border bg-surface'
            )}
          >
            <span className="w-8 text-center shrink-0">
              {rank < 3
                ? <span className="text-xl">{MEDALS[rank]}</span>
                : <span className="text-sm font-bold text-muted-foreground">{rank + 1}.</span>
              }
            </span>

            <Avatar src={player.photoURL} name={player.displayName} size="sm" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground truncate">
                  {player.displayName}{isMe && <span className="text-xs font-normal text-muted-foreground ml-1">(te)</span>}
                </p>
                <p className="text-sm font-bold text-foreground shrink-0 tabular-nums">
                  {player.totalScore}<span className="text-xs font-normal text-muted-foreground ml-0.5">p</span>
                </p>
              </div>

              <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', isWinner ? 'bg-amber-400' : 'bg-primary-400')}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <p className="text-[10px] text-muted-foreground mt-0.5">{player.roundsPlayed} kör · {pct}%</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
