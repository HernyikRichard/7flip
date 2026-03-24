import Link from 'next/link'
import { Users } from 'lucide-react'
import GameStatusBadge from './GameStatusBadge'
import Avatar from '@/components/ui/Avatar'
import { formatRelativeTime, toDate } from '@/lib/utils'
import { GAME_MODE_META } from '@/lib/game-modes'
import type { Game } from '@/types'
import { cn } from '@/lib/utils'

interface GameCardProps {
  game: Game
  currentUid: string
}

const MODE_BADGE: Record<string, string> = {
  classic: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  revenge: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  brutal:  'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
}

export default function GameCard({ game, currentUid }: GameCardProps) {
  const isFinished = game.status === 'game_finished'
  const winner     = isFinished ? game.players.find((p) => p.uid === game.winnerId) : null
  const href       = isFinished ? `/history/${game.id}` : `/games/${game.id}`
  const sorted     = [...game.players].sort((a, b) => b.totalScore - a.totalScore)
  const mode       = game.gameMode ?? 'classic'
  const modeMeta   = GAME_MODE_META[mode]

  return (
    <Link
      href={href}
      className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-4 card-shadow active:scale-[0.98] transition-transform"
    >
      {/* Top row: mode + status + date */}
      <div className="flex items-center gap-2">
        <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full', MODE_BADGE[mode])}>
          {modeMeta.label}
        </span>
        <span className="text-xs text-muted-foreground flex-1 truncate">
          {formatRelativeTime(toDate(game.createdAt) ?? new Date())}
          {' · '}
          {game.roundCount}. kör
        </span>
        <GameStatusBadge status={game.status} />
      </div>

      {/* Players */}
      <div className="flex items-center gap-2.5">
        <div className="flex -space-x-2 shrink-0">
          {game.players.slice(0, 4).map((p) => (
            <Avatar
              key={p.uid}
              src={p.photoURL}
              name={p.displayName}
              size="sm"
              className="ring-2 ring-surface"
            />
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate leading-tight">
            {game.players.map((p) => p.displayName).join(', ')}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Users size={11} />
            {game.players.length} játékos
          </p>
        </div>
      </div>

      {/* Active: standings */}
      {!isFinished && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {sorted.map((p) => (
            <div
              key={p.uid}
              className={cn(
                'shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold',
                p.uid === currentUid
                  ? 'bg-primary-500/10 text-primary-700 dark:text-primary-300 ring-1 ring-primary-400/30'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {p.displayName.split(' ')[0]}: {p.totalScore}p
            </div>
          ))}
        </div>
      )}

      {/* Finished: winner */}
      {isFinished && winner && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 px-3.5 py-2.5 flex items-center gap-2">
          <span className="text-base">🏆</span>
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
              {winner.displayName}
            </p>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/80">{winner.totalScore} pont</p>
          </div>
        </div>
      )}
    </Link>
  )
}
