'use client'

import Avatar from '@/components/ui/Avatar'
import { ACTION_CARD_LABELS } from '@/lib/gameConstants'
import type { PendingAction, GamePlayer } from '@/types'
import { cn } from '@/lib/utils'

interface ActionTargetSheetProps {
  action: PendingAction
  players: GamePlayer[]
  onSelect: (targetUid: string) => void
}

const ACTION_META: Record<string, { icon: string; desc: string; color: string }> = {
  just_one_more: {
    icon: '🎴',
    desc: 'A kiválasztott játékos 1 lapot kap',
    color: 'text-violet-600 dark:text-violet-400',
  },
  swap: {
    icon: '🔄',
    desc: 'Cseréld fel bármely két face-up lapot',
    color: 'text-blue-600 dark:text-blue-400',
  },
  steal: {
    icon: '🫳',
    desc: 'Vegyél el egy lapot magadnak',
    color: 'text-yellow-600 dark:text-yellow-400',
  },
  discard: {
    icon: '🗑️',
    desc: 'Eldobod egy játékos egyik lapját',
    color: 'text-orange-600 dark:text-orange-400',
  },
  flip_four: {
    icon: '⚡',
    desc: 'A kiválasztott játékos 4 lapot kap egymás után',
    color: 'text-orange-600 dark:text-orange-400',
  },
  flip_three: {
    icon: '⚡',
    desc: 'A kiválasztott játékos 3 lapot kap egymás után',
    color: 'text-yellow-600 dark:text-yellow-400',
  },
  freeze: {
    icon: '❄️',
    desc: 'A kiválasztott játékos egy körig nem húzhat',
    color: 'text-cyan-600 dark:text-cyan-400',
  },
}

export default function ActionTargetSheet({ action, players, onSelect }: ActionTargetSheetProps) {
  const targets = players.filter((p) => action.availableTargetUids.includes(p.uid))
  const actor   = players.find((p) => p.uid === action.playedByUid)
  const meta    = ACTION_META[action.actionType]

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        className="relative bg-surface rounded-t-3xl border-t border-border flex flex-col animate-slide-up"
        style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-4 text-center">
          {meta && (
            <p className={cn('text-2xl mb-1', meta.color)}>{meta.icon}</p>
          )}
          <p className="font-bold text-foreground text-base">
            {ACTION_CARD_LABELS[action.actionType] ?? action.actionType}
          </p>
          {actor && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {actor.displayName} kijátszotta
            </p>
          )}
          {meta?.desc && (
            <p className={cn('text-xs mt-1.5 font-medium', meta.color)}>
              {meta.desc}
            </p>
          )}
        </div>

        {/* Target list */}
        <div className="flex flex-col gap-2 px-4">
          {targets.map((p) => (
            <button
              key={p.uid}
              onClick={() => onSelect(p.uid)}
              className="flex items-center gap-3 rounded-2xl border border-border bg-muted px-4 py-3.5 hover:border-primary-400/60 hover:bg-primary-500/5 active:scale-[0.98] transition-all text-left"
            >
              <Avatar src={p.photoURL} name={p.displayName} size="sm" />
              <span className="font-semibold text-[15px] text-foreground">{p.displayName}</span>
              <span className="ml-auto text-muted-foreground text-lg">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
