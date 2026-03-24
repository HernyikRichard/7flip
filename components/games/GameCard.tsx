import Link from 'next/link'
import { Users, Calendar } from 'lucide-react'
import GameStatusBadge from './GameStatusBadge'
import Avatar from '@/components/ui/Avatar'
import { formatRelativeTime, toDate } from '@/lib/utils'
import { GAME_MODE_LABELS } from '@/lib/gameModes'
import type { Game } from '@/types'

interface GameCardProps {
  game: Game
  currentUid: string
}

export default function GameCard({ game, currentUid }: GameCardProps) {
  const isFinished = game.status === 'game_finished'
  const winner = isFinished ? game.players.find((p) => p.uid === game.winnerId) : null
  const href = isFinished ? `/history/${game.id}` : `/games/${game.id}`

  // Rendezés totalScore szerint csökkenő sorrendben
  const sorted = [...game.players].sort((a, b) => b.totalScore - a.totalScore)

  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar size={14} />
          <span>{formatRelativeTime(toDate(game.createdAt) ?? new Date())}</span>
          {game.gameMode === 'revenge' && (
            <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
              💀 {GAME_MODE_LABELS['revenge']}
            </span>
          )}
        </div>
        <GameStatusBadge status={game.status} />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {game.players.slice(0, 4).map((p) => (
            <Avatar key={p.uid} src={p.photoURL} name={p.displayName} size="sm" className="ring-2 ring-surface" />
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {game.players.map((p) => p.displayName).join(', ')}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users size={11} />
            {game.players.length} játékos · {game.roundCount}. kör
          </p>
        </div>
      </div>

      {/* Aktív: állás */}
      {!isFinished && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {sorted.map((p) => (
            <div
              key={p.uid}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-sm ${
                p.uid === currentUid
                  ? 'bg-primary-100 text-primary-700 font-semibold dark:bg-primary-950 dark:text-primary-300'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {p.displayName.split(' ')[0]}: {p.totalScore} p
            </div>
          ))}
        </div>
      )}

      {/* Befejezett: győztes */}
      {isFinished && winner && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950 px-3 py-2 text-sm text-amber-700 dark:text-amber-300 font-medium">
          🏆 Győztes: {winner.displayName} ({winner.totalScore} pont)
        </div>
      )}
    </Link>
  )
}
