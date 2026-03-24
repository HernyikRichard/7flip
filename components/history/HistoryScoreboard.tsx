'use client'

import Avatar from '@/components/ui/Avatar'
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
        const isMe = player.uid === currentUid
        const pct = Math.min(Math.round((player.totalScore / targetScore) * 100), 100)

        return (
          <div
            key={player.uid}
            className={`flex items-center gap-3 rounded-2xl border p-3 ${
              isWinner
                ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30'
                : isMe
                  ? 'border-primary-300 bg-primary-50 dark:border-primary-800 dark:bg-primary-950/30'
                  : 'border-border bg-surface'
            }`}
          >
            <span className="w-8 text-center shrink-0 text-xl">
              {rank < 3 ? MEDALS[rank] : <span className="text-sm font-bold text-muted-foreground">{rank + 1}.</span>}
            </span>

            <Avatar src={player.photoURL} name={player.displayName} size="sm" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground truncate">
                  {player.displayName}{isMe && ' (te)'}
                </p>
                <p className="text-sm font-bold text-foreground shrink-0">{player.totalScore} p</p>
              </div>

              <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${isWinner ? 'bg-amber-400' : 'bg-primary-400'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <p className="text-xs text-muted-foreground mt-0.5">{player.roundsPlayed} kör · {pct}%</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
