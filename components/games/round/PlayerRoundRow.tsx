'use client'

import Avatar from '@/components/ui/Avatar'
import type { RoundPlayerState, GamePlayer } from '@/types'
import {
  isNumberCard, isModifierCard,
  isZeroCard, isUnlucky7, isLucky13,
} from '@/types/card.types'
import type { ModifierCard } from '@/types/card.types'
import { cn } from '@/lib/utils'

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

// Állapot-specifikus vizuális konfig
const STATUS_STYLES: Record<string, {
  container: string
  glow: string
  badge: string | null
  badgeCls: string
}> = {
  active: {
    container: 'border-border bg-surface',
    glow: '',
    badge: null,
    badgeCls: '',
  },
  stayed: {
    container: 'border-emerald-500/40 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.04]',
    glow: 'glow-stayed',
    badge: '✋ Megállt',
    badgeCls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  busted: {
    container: 'border-red-500/40 bg-red-500/[0.04] dark:bg-red-500/[0.04]',
    glow: 'glow-bust',
    badge: '💥 Bust',
    badgeCls: 'bg-red-500/10 text-red-700 dark:text-red-400',
  },
  flip7: {
    container: 'border-amber-500/40 bg-amber-500/[0.04] dark:bg-amber-500/[0.04]',
    glow: 'glow-flip7',
    badge: '🎉 Flip 7!',
    badgeCls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  frozen: {
    container: 'border-cyan-500/40 bg-cyan-500/[0.04] dark:bg-cyan-500/[0.04]',
    glow: 'glow-frozen',
    badge: '❄️ Fagyott',
    badgeCls: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  },
}

export default function PlayerRoundRow({
  player, state, isCurrentUser, canAct, flipFourPending, onAddCard, onStand, onBust,
}: PlayerRoundRowProps) {
  const s       = STATUS_STYLES[state.status] ?? STATUS_STYLES.active
  const isActive = state.status === 'active'
  const hasCards = state.handCards.length > 0
  const liveSum  = state.numberCards.reduce((acc, n) => acc + n, 0)

  return (
    <div className={cn(
      'rounded-2xl border-2 overflow-hidden transition-all duration-200',
      s.container,
      s.glow,
      isCurrentUser && 'ring-2 ring-primary-500/40 ring-offset-2 ring-offset-background',
      flipFourPending && !s.glow && 'ring-2 ring-orange-400/60 ring-offset-2 ring-offset-background',
    )}>

      {/* ── Fejléc ── */}
      <div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
        <Avatar src={player.photoURL} name={player.displayName} size="sm" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-[15px] text-foreground leading-tight truncate max-w-[140px]">
              {player.displayName}
              {isCurrentUser && (
                <span className="text-xs font-normal text-muted-foreground ml-1">(te)</span>
              )}
            </p>
            {player.isGuest && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted rounded-full px-2 py-0.5 shrink-0">
                Vendég
              </span>
            )}
            {s.badge && (
              <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0', s.badgeCls)}>
                {s.badge}
              </span>
            )}
          </div>

          {/* Mini státusz indikátorok */}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {state.zeroLocked && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-none">⬛ The Zero</span>
            )}
            {state.forcedHit && (
              <span className="text-[11px] text-orange-500 dark:text-orange-400 leading-none">⚡ Köteles húzni</span>
            )}
            {state.secondChance && (
              <span className="text-[11px] text-blue-500 dark:text-blue-400 leading-none">🛡 Second Chance</span>
            )}
            {flipFourPending && (
              <span className="text-[11px] text-orange-500 dark:text-orange-400 leading-none">🔄 Flip Four</span>
            )}
          </div>
        </div>

        {/* Pontszám */}
        <div className="shrink-0 text-right min-w-[44px]">
          {state.roundScore !== null ? (
            <p className={cn(
              'text-xl font-bold tabular-nums leading-tight',
              state.roundScore < 0    ? 'text-red-500 dark:text-red-400'   :
              state.status === 'flip7'? 'text-amber-600 dark:text-amber-400':
              'text-foreground'
            )}>
              {state.roundScore}
              <span className="text-xs font-normal text-muted-foreground ml-0.5">p</span>
            </p>
          ) : hasCards && isActive ? (
            <p className="text-base font-semibold tabular-nums text-muted-foreground">
              {liveSum}
            </p>
          ) : null}
        </div>
      </div>

      {/* ── Kártyák ── */}
      {hasCards && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {state.handCards.map((hc, i) => {
            const card = hc.card

            if (isNumberCard(card)) {
              const isZero = isZeroCard(card)
              const isU7   = isUnlucky7(card)
              const isL13  = isLucky13(card)

              return (
                <span
                  key={i}
                  className={cn(
                    'card-chip animate-card-appear',
                    isZero ? 'border-slate-400/40 bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600/40' :
                    isU7   ? 'border-red-400/60 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 dark:border-red-500/40' :
                    isL13  ? 'border-amber-400/60 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-500/40' :
                             'border-border bg-surface-elevated text-foreground'
                  )}
                >
                  {card.value}
                </span>
              )
            }

            if (isModifierCard(card)) {
              const mc = card as ModifierCard
              const label =
                mc.modifierType === 'divide2' ? '÷2' :
                mc.modifierType === 'x2'      ? '×2' :
                mc.modifierType === 'plus'    ? `+${mc.value ?? ''}` :
                                                `-${mc.value ?? mc.minusValue ?? ''}`
              const isBonus = mc.modifierType === 'x2' || mc.modifierType === 'plus'

              return (
                <span
                  key={i}
                  className={cn(
                    'inline-flex items-center justify-center h-11 px-2.5 rounded-[10px] border font-bold text-sm shadow-sm shrink-0 animate-card-appear',
                    isBonus
                      ? 'border-emerald-400/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-500/40'
                      : 'border-orange-400/50 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-500/40'
                  )}
                >
                  {label}
                </span>
              )
            }

            return null
          })}
        </div>
      )}

      {/* ── Score breakdown (kör végén) ── */}
      {state.scoreBreakdown && (
        <div className="px-4 pb-3">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {state.scoreBreakdown.busted ? (
              <span className="text-red-500 dark:text-red-400">
                Bust — {state.scoreBreakdown.bustPenalty ? `${state.scoreBreakdown.bustPenalty} pont` : '0 pont'}
              </span>
            ) : state.scoreBreakdown.forcedZero ? (
              <span className="text-slate-400 dark:text-slate-500">The Zero — 0 pont</span>
            ) : (
              [
                state.scoreBreakdown.numberSum > 0 && `Σ ${state.scoreBreakdown.numberSum}`,
                state.scoreBreakdown.divide2Applied && `÷2 → ${state.scoreBreakdown.halvedSum}`,
                !state.scoreBreakdown.divide2Applied &&
                  state.scoreBreakdown.halvedSum !== state.scoreBreakdown.numberSum &&
                  state.scoreBreakdown.halvedSum > 0 &&
                  `×2 → ${state.scoreBreakdown.halvedSum}`,
                state.scoreBreakdown.modifierPenalty > 0 && `−${state.scoreBreakdown.modifierPenalty}`,
                state.scoreBreakdown.flip7Bonus > 0 && `🎉 +${state.scoreBreakdown.flip7Bonus}`,
              ].filter(Boolean).join('  ·  ')
            )}
          </p>
        </div>
      )}

      {/* ── Akció gombok ── */}
      {isActive && canAct && (
        <div className="flex gap-2 px-3 pb-3 pt-0.5">
          <button
            onClick={onAddCard}
            className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl border-2 border-dashed border-primary-400/70 bg-primary-500/5 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-500/10 hover:border-primary-400 active:scale-[0.97] transition-all"
          >
            <span className="text-lg leading-none font-bold">+</span>
            <span>Lap</span>
          </button>
          <button
            onClick={onStand}
            className="h-11 px-4 rounded-xl border-2 border-emerald-500/50 bg-emerald-500/5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 active:scale-[0.97] transition-all"
          >
            Megállok
          </button>
          <button
            onClick={onBust}
            className="h-11 px-3 rounded-xl border-2 border-red-500/50 bg-red-500/5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 active:scale-[0.97] transition-all"
          >
            💥
          </button>
        </div>
      )}
    </div>
  )
}
