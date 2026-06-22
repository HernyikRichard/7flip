import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { GameStatus, GameMode } from '@/types'

const GAME_STATUS_LABELS: Partial<Record<GameStatus, string>> = {
  waiting_for_players: 'Lobby',
  in_round:            'Kör folyamatban',
  awaiting_action:     'Akcióra vár',
  awaiting_brutal_flip7: 'Döntésre vár',
  round_finished:      'Kör vége',
}

const GAME_MODE_BADGE: Record<GameMode, 'classic' | 'revenge' | 'brutal'> = {
  classic: 'classic',
  revenge: 'revenge',
  brutal:  'brutal',
}

const GAME_MODE_LABELS: Record<GameMode, string> = {
  classic: 'Classic',
  revenge: 'Revenge',
  brutal:  'Brutal',
}

export interface ActiveGameInfo {
  gameId: string
  status: GameStatus
  gameMode: GameMode
}

interface FriendCardProps {
  uid: string
  displayName: string
  username: string
  photoURL?: string | null
  activeGame?: ActiveGameInfo | null
  onWatch?: (gameId: string) => void
  primaryAction?: {
    label: string
    onClick: () => void
    loading?: boolean
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    disabled?: boolean
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    loading?: boolean
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  }
  className?: string
}

export default function FriendCard({
  displayName,
  username,
  photoURL,
  activeGame,
  onWatch,
  primaryAction,
  secondaryAction,
  className,
}: FriendCardProps) {
  const isPlaying = !!activeGame?.gameId && activeGame.status !== 'game_finished'

  return (
    <div className={cn(
      'flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 card-shadow',
      className
    )}>
      <div className="relative shrink-0">
        <Avatar src={photoURL} name={displayName} size="md" />
        {isPlaying && (
          <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-surface" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[15px] text-foreground truncate leading-tight">{displayName}</p>
        {isPlaying ? (
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {GAME_STATUS_LABELS[activeGame!.status] ?? 'Játszik'}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <Badge size="sm" variant={GAME_MODE_BADGE[activeGame!.gameMode]}>
              {GAME_MODE_LABELS[activeGame!.gameMode]}
            </Badge>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground truncate mt-0.5">@{username}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isPlaying && onWatch && (
          <Button size="sm" variant="secondary" onClick={() => onWatch(activeGame!.gameId)}>
            Megtekintés
          </Button>
        )}
        {secondaryAction && (
          <Button
            size="sm"
            variant={secondaryAction.variant ?? 'ghost'}
            loading={secondaryAction.loading}
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </Button>
        )}
        {primaryAction && (
          <Button
            size="sm"
            variant={primaryAction.variant ?? 'primary'}
            loading={primaryAction.loading}
            onClick={primaryAction.onClick}
          >
            {primaryAction.label}
          </Button>
        )}
      </div>
    </div>
  )
}
