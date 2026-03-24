import Badge from '@/components/ui/Badge'
import type { GameStatus } from '@/types'

const STATUS_MAP: Record<GameStatus, { label: string; variant: 'success' | 'info' | 'default' | 'warning' }> = {
  waiting_for_players: { label: 'Várakozás',      variant: 'default'  },
  in_round:            { label: 'Kör folyamatban', variant: 'info'     },
  awaiting_action:     { label: 'Döntés…',         variant: 'warning'  },
  round_finished:      { label: 'Kör vége',         variant: 'default'  },
  game_finished:       { label: 'Befejezett',       variant: 'success'  },
}

export default function GameStatusBadge({ status }: { status: GameStatus }) {
  const { label, variant } = STATUS_MAP[status]
  return <Badge variant={variant}>{label}</Badge>
}
