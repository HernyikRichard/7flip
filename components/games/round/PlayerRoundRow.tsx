'use client'

import Avatar from '@/components/ui/Avatar'
import {
  MODIFIER_CARD_COLORS, PLAYER_STATUS_LABELS,
  NUMBER_CARD_COLOR,
} from '@/lib/gameConstants'
import type { RoundPlayerState, GamePlayer } from '@/types'

interface PlayerRoundRowProps {
  player: GamePlayer
  state: RoundPlayerState
  isCurrentUser: boolean
  canAct: boolean
  flipFourPending?: boolean
  onAddCard: () => void
  onStand: () => void
  onBust: () => void
}

const STATUS_ROW_COLORS: Record<string, string> = {
  active:  'border-border bg-surface',
  stayed:  'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30',
  busted:  'border-red-300 bg-red-50 dark:bg-red-950/30',
  flip7:   'border-amber-300 bg-amber-50 dark:bg-amber-950/30',
  frozen:  'border-cyan-300 bg-cyan-50 dark:bg-cyan-950/30',
}

const STATUS_ICONS: Record<string, string> = {
  active:  '',
  stayed:  '✋',
  busted:  '💥',
  flip7:   '🎉',
  frozen:  '❄️',
}

export default function PlayerRoundRow({
  player, state, isCurrentUser, canAct, flipFourPending, onAddCard, onStand, onBust,
}: PlayerRoundRowProps) {
  const isActive      = state.status === 'active'
  const statusColor   = STATUS_ROW_COLORS[state.status] ?? 'border-border bg-surface'
  const numberCards   = state.numberCards   ?? []
  const modifierCards = state.modifierCards ?? []
  const liveSum       = numberCards.reduce((s, n) => s + n, 0)
  const hasCards      = numberCards.length > 0 || modifierCards.length > 0

  return (
    <div className={`
      rounded-2xl border-2 px-4 py-3 flex flex-col gap-2.5
      transition-colors duration-200
      ${statusColor}
      ${isCurrentUser ? 'ring-2 ring-primary-300 ring-offset-1' : ''}
      ${flipFourPending ? 'ring-2 ring-orange-400 ring-offset-1' : ''}
    `}>

      {/* Fejléc */}
      <div className="flex items-center gap-2.5">
        <Avatar src={player.photoURL} name={player.displayName} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate leading-tight">
            {STATUS_ICONS[state.status] && (
              <span className="mr-1">{STATUS_ICONS[state.status]}</span>
            )}
            {player.displayName}
            {isCurrentUser && <span className="text-xs text-muted-foreground font-normal ml-1">(te)</span>}
          </p>
          <p className="text-xs text-muted-foreground">{PLAYER_STATUS_LABELS[state.status]}</p>
        </div>

        {/* Jobb oldal: összeg / végpontszám */}
        <div className="flex items-center gap-2 shrink-0">
          {state.roundScore !== null ? (
            <span className={`font-bold text-base tabular-nums ${state.roundScore === 0 ? 'text-red-500 dark:text-red-400' : 'text-foreground'}`}>
              {state.roundScore} p
            </span>
          ) : hasCards && isActive ? (
            <span className="font-semibold text-sm tabular-nums text-muted-foreground">
              {liveSum}
            </span>
          ) : null}
        </div>
      </div>

      {/* Kártyák */}
      {hasCards && (
        <div className="flex flex-wrap gap-1.5">
          {numberCards.map((n, i) => (
            <span
              key={i}
              className={`
                inline-flex items-center justify-center
                w-9 h-10 rounded-xl border-2 font-bold text-base
                ${NUMBER_CARD_COLOR}
                shadow-sm
              `}
            >
              {n}
            </span>
          ))}
          {modifierCards.map((m, i) => (
            <span
              key={i}
              className={`
                inline-flex items-center justify-center
                px-3 h-10 rounded-xl border-2 font-bold text-sm
                ${MODIFIER_CARD_COLORS[m.modifierType]}
                shadow-sm
              `}
            >
              {m.modifierType === 'divide2' ? '÷2'
              : m.modifierType === 'x2' ? '×2'
              : m.modifierType === 'plus' ? `+${m.value ?? m.minusValue ?? ''}`
              : `-${m.value ?? m.minusValue}`}
            </span>
          ))}
        </div>
      )}

      {/* Score breakdown (kör végén) */}
      {state.scoreBreakdown && !state.scoreBreakdown.busted && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {[
            state.scoreBreakdown.numberSum > 0 && `Számok: ${state.scoreBreakdown.numberSum}`,
            state.scoreBreakdown.divide2Applied && `÷2 = ${state.scoreBreakdown.halvedSum}`,
            // classic: halvedSum shows x2-multiplied value when no divide2 but modifier changed the sum
            !state.scoreBreakdown.divide2Applied &&
              state.scoreBreakdown.halvedSum !== state.scoreBreakdown.numberSum &&
              state.scoreBreakdown.halvedSum > 0 &&
              `×2 = ${state.scoreBreakdown.halvedSum}`,
            state.scoreBreakdown.modifierPenalty > 0 && `-${state.scoreBreakdown.modifierPenalty}`,
            state.scoreBreakdown.flip7Bonus > 0 && `🎉 Flip 7: +${state.scoreBreakdown.flip7Bonus}`,
          ].filter(Boolean).join('  ·  ')}
        </p>
      )}

      {/* Flip Four jelzés */}
      {flipFourPending && (
        <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
          🔄 Flip Four — 4 lapot kap
        </p>
      )}

      {/* Akció gombok */}
      {isActive && canAct && (
        <div className="flex gap-2 pt-0.5">
          <button
            onClick={onAddCard}
            className="
              flex-1 flex items-center justify-center gap-1.5
              rounded-xl border-2 border-dashed border-primary-400
              bg-primary-50 dark:bg-primary-950/40
              py-2.5 text-sm font-semibold text-primary-600 dark:text-primary-400
              hover:bg-primary-100 dark:hover:bg-primary-950/60
              active:scale-[0.98] transition-all
            "
          >
            <span className="text-base leading-none">+</span> Lap
          </button>
          <button
            onClick={onStand}
            className="
              rounded-xl border-2 border-emerald-300
              bg-emerald-50 dark:bg-emerald-950/40
              px-4 py-2.5 text-sm font-semibold
              text-emerald-700 dark:text-emerald-400
              hover:bg-emerald-100 dark:hover:bg-emerald-950/60
              active:scale-[0.98] transition-all
            "
          >
            Megállok
          </button>
          <button
            onClick={onBust}
            className="
              rounded-xl border-2 border-red-300
              bg-red-50 dark:bg-red-950/40
              px-3 py-2.5 text-sm font-semibold
              text-red-600 dark:text-red-400
              hover:bg-red-100 dark:hover:bg-red-950/60
              active:scale-[0.98] transition-all
            "
          >
            💥
          </button>
        </div>
      )}
    </div>
  )
}
