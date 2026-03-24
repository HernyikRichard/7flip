'use client'

import Avatar from '@/components/ui/Avatar'
import { ACTION_CARD_LABELS } from '@/lib/gameConstants'
import type { PendingAction, GamePlayer } from '@/types'

interface ActionTargetSheetProps {
  action: PendingAction
  players: GamePlayer[]
  onSelect: (targetUid: string) => void
}

export default function ActionTargetSheet({ action, players, onSelect }: ActionTargetSheetProps) {
  const targets = players.filter((p) => action.availableTargets.includes(p.uid))
  const actor   = players.find((p) => p.uid === action.playedByUid)

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col justify-end bg-black/40">
      <div className="bg-surface rounded-t-3xl border-t border-border p-4 flex flex-col gap-4" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
        <div>
          <p className="font-semibold text-foreground text-center">
            {ACTION_CARD_LABELS[action.actionType]}
          </p>
          {actor && (
            <p className="text-sm text-muted-foreground text-center mt-0.5">
              {actor.displayName} kijátszotta — válassz célt
            </p>
          )}
          {action.actionType === 'flip_three' && (
            <p className="text-xs text-orange-600 dark:text-orange-400 text-center mt-1">
              A kiválasztott játékos 3 extra lapot kap
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {targets.map((p) => (
            <button
              key={p.uid}
              onClick={() => onSelect(p.uid)}
              className="flex items-center gap-3 rounded-2xl border border-border bg-muted px-4 py-3 hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors"
            >
              <Avatar src={p.photoURL} name={p.displayName} size="sm" />
              <span className="font-medium text-foreground">{p.displayName}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
