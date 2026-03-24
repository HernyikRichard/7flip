'use client'

import { useState } from 'react'
import type { Card } from '@/types/card.types'
import {
  ACTION_CARD_LABELS, ACTION_CARD_COLORS,
  MODIFIER_CARD_LABELS, MODIFIER_CARD_COLORS,
  SPECIAL_NUMBER_COLORS, SPECIAL_NUMBER_LABELS,
} from '@/lib/gameConstants'
import type { ClassicActionType, RevengeActionType } from '@/types/card.types'
import { cn } from '@/lib/utils'

interface CardPickerModalProps {
  playerName: string
  gameMode?: string
  existingNumbers?: number[]
  onPickMultiple: (numbers: number[]) => void
  onPick: (card: Card) => void
  onDirectScore: (score: number) => void
  onCancel: () => void
}

export const CLASSIC_NUMBERS = [1,2,3,4,5,6,8,9,10,11,12]
export const REVENGE_NUMBERS = [1,2,3,4,5,6,7,8,9,10,11,12,13]

const MINUS_VALUES  = [2, 4, 6, 8, 10] as const
const PLUS_VALUES   = [5, 10, 15] as const

const CLASSIC_ACTIONS: ClassicActionType[]  = ['freeze', 'flip_three', 'second_chance']
const REVENGE_ACTIONS: RevengeActionType[]  = ['just_one_more', 'swap', 'steal', 'discard', 'flip_four']

type Tab = 'numbers' | 'special' | 'direct'

// Szín a szám értéke alapján
function getNumberColor(n: number, isSelected: boolean, wouldBust: boolean): string {
  if (isSelected) return 'border-primary-500 bg-primary-500/10 text-primary-700 dark:text-primary-300 ring-2 ring-primary-400/50'
  if (wouldBust)  return 'border-red-400/60 bg-red-500/5 text-red-500 dark:text-red-400'
  return 'border-border bg-surface-elevated text-foreground hover:border-primary-400/60 hover:bg-primary-500/5'
}

export default function CardPickerModal({
  playerName,
  gameMode = 'classic',
  existingNumbers = [],
  onPickMultiple,
  onPick,
  onDirectScore,
  onCancel,
}: CardPickerModalProps) {
  const NUMBERS = gameMode === 'revenge' || gameMode === 'brutal' ? REVENGE_NUMBERS : CLASSIC_NUMBERS
  const [tab, setTab] = useState<Tab>('numbers')
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([])
  const [directValue, setDirectValue] = useState('')

  const currentSum  = existingNumbers.reduce((s, n) => s + n, 0)
  const selectedSum = selectedNumbers.reduce((s, n) => s + n, 0)

  function toggleNumber(n: number) {
    setSelectedNumbers((prev) => {
      const idx = prev.indexOf(n)
      if (idx !== -1) return prev.filter((_, i) => i !== idx)
      if (prev.length >= 7) return prev
      return [...prev, n]
    })
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'numbers', label: 'Számok' },
    { id: 'special', label: 'Akció' },
    { id: 'direct',  label: 'Végső pont' },
  ]

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-end bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-surface rounded-t-3xl border-t border-border flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-1.5 pb-3 shrink-0">
          <div>
            <p className="font-bold text-foreground text-[15px] leading-tight">{playerName}</p>
            {existingNumbers.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Összeg: <span className="font-semibold text-foreground">{currentSum}</span>
                <span className="mx-1 opacity-40">·</span>
                {existingNumbers.length} lap
              </p>
            )}
          </div>
          <button
            onClick={onCancel}
            className="rounded-xl bg-muted px-3.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors shrink-0"
          >
            Mégse
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex mx-5 mb-4 rounded-xl bg-muted p-1 gap-1 shrink-0">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setSelectedNumbers([]) }}
              className={cn(
                'flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors',
                tab === id
                  ? 'bg-surface text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content — scrollable */}
        <div
          className="overflow-y-auto px-5"
          style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))', maxHeight: '65dvh' }}
        >

          {/* ── SZÁMKÁRTYÁK ── */}
          {tab === 'numbers' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-6 gap-2">
                {NUMBERS.map((n) => {
                  const wouldBust = existingNumbers.includes(n)
                  const selIdx    = selectedNumbers.indexOf(n)
                  const isSelected = selIdx !== -1
                  const full = selectedNumbers.length >= 7 && !isSelected

                  return (
                    <button
                      key={n}
                      disabled={full}
                      onClick={() => toggleNumber(n)}
                      className={cn(
                        'relative flex flex-col items-center justify-center',
                        'rounded-xl border-2 aspect-[3/4] text-lg font-bold',
                        'shadow-sm active:scale-90 transition-all duration-100',
                        'disabled:opacity-30',
                        getNumberColor(n, isSelected, wouldBust)
                      )}
                    >
                      {n}
                      {isSelected && (
                        <span className="absolute -top-1.5 -right-1.5 text-[10px] leading-none bg-primary-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold shadow-sm">
                          {selIdx + 1}
                        </span>
                      )}
                      {!isSelected && wouldBust && (
                        <span className="absolute -top-1.5 -right-1.5 text-xs leading-none select-none">💥</span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Summary + confirm */}
              <div className="flex items-center gap-3 pb-1">
                <p className="flex-1 text-xs text-muted-foreground">
                  {selectedNumbers.length === 0
                    ? 'Jelöld ki a húzott lapokat (max 7)'
                    : (
                      <span>
                        <span className="font-semibold text-foreground">{selectedNumbers.join(', ')}</span>
                        <span className="text-muted-foreground"> — összeg: </span>
                        <span className="font-semibold text-foreground">{selectedSum}</span>
                      </span>
                    )
                  }
                </p>
                <button
                  disabled={selectedNumbers.length === 0}
                  onClick={() => onPickMultiple(selectedNumbers)}
                  className="rounded-2xl border-2 border-primary-400 bg-primary-500/10 px-5 py-2.5 text-sm font-bold text-primary-600 dark:text-primary-400 active:scale-[0.97] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  OK
                </button>
              </div>
            </div>
          )}

          {/* ── AKCIÓ + MÓDOSÍTÓKÁRTYÁK ── */}
          {tab === 'special' && (
            <div className="flex flex-col gap-5">

              {/* Speciális számkártyák */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">
                  Speciális számkártyák
                </p>
                <div className="flex flex-col gap-2">
                  {[
                    { card: { cardType: 'number', variant: 'zero', value: 0 } as Card,
                      label: SPECIAL_NUMBER_LABELS.zero,
                      sub: 'Körpontszám 0 lesz (Flip 7 kivétel)',
                      cls: SPECIAL_NUMBER_COLORS.zero },
                    { card: { cardType: 'number', variant: 'unlucky7', value: 7 } as Card,
                      label: SPECIAL_NUMBER_LABELS.unlucky7,
                      sub: 'Korábbi lapok eldobva, csak 7 marad',
                      cls: SPECIAL_NUMBER_COLORS.unlucky7 },
                    { card: { cardType: 'number', variant: 'lucky13', value: 13 } as Card,
                      label: SPECIAL_NUMBER_LABELS.lucky13,
                      sub: '2 db engedett, 3. = bust',
                      cls: SPECIAL_NUMBER_COLORS.lucky13 },
                  ].map(({ card, label, sub, cls }) => (
                    <button
                      key={label}
                      onClick={() => onPick(card)}
                      className={cn(
                        'rounded-2xl border-2 px-4 py-3 text-sm font-semibold text-left',
                        'active:scale-[0.98] transition-transform',
                        cls
                      )}
                    >
                      <span>{label}</span>
                      <span className="block text-xs font-normal opacity-70 mt-0.5">{sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Akciókártyák */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">
                  Akciókártyák
                </p>
                <div className="flex flex-col gap-2">
                  {(gameMode === 'classic' ? CLASSIC_ACTIONS : REVENGE_ACTIONS).map((at) => (
                    <button
                      key={at}
                      onClick={() => onPick({ cardType: 'action', actionType: at })}
                      className={cn(
                        'rounded-2xl border-2 px-4 py-3 text-sm font-semibold text-left',
                        'active:scale-[0.98] transition-transform',
                        ACTION_CARD_COLORS[at]
                      )}
                    >
                      {ACTION_CARD_LABELS[at]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Módosítókártyák */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">
                  Módosítókártyák
                </p>
                {gameMode === 'classic' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onPick({ cardType: 'modifier', modifierType: 'x2' })}
                      className={cn('rounded-2xl border-2 py-3.5 text-center font-bold active:scale-95 transition-transform', MODIFIER_CARD_COLORS.x2)}
                    >
                      {MODIFIER_CARD_LABELS.x2}
                    </button>
                    {PLUS_VALUES.map((v) => (
                      <button
                        key={v}
                        onClick={() => onPick({ cardType: 'modifier', modifierType: 'plus', value: v })}
                        className={cn('rounded-2xl border-2 py-3.5 text-center font-bold active:scale-95 transition-transform', MODIFIER_CARD_COLORS.plus)}
                      >
                        +{v}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => onPick({ cardType: 'modifier', modifierType: 'divide2' })}
                      className={cn('rounded-2xl border-2 py-3.5 text-center font-bold active:scale-95 transition-transform', MODIFIER_CARD_COLORS.divide2)}
                    >
                      {MODIFIER_CARD_LABELS.divide2}
                    </button>
                    {MINUS_VALUES.map((v) => (
                      <button
                        key={v}
                        onClick={() => onPick({ cardType: 'modifier', modifierType: 'minus', value: v })}
                        className={cn('rounded-2xl border-2 py-3.5 text-center font-bold active:scale-95 transition-transform', MODIFIER_CARD_COLORS.minus)}
                      >
                        −{v}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── VÉGSŐ PONT ── */}
          {tab === 'direct' && (
            <div className="flex flex-col gap-5 py-2">
              <p className="text-sm text-muted-foreground text-center">
                Közvetlen kör-pontszám rögzítése
              </p>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={directValue}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '')
                  setDirectValue(raw)
                }}
                placeholder="0"
                className="w-full rounded-2xl border-2 border-border bg-surface-elevated text-center text-5xl font-bold tabular-nums text-foreground py-5 outline-none focus:border-primary-400 transition-colors"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => onDirectScore(0)}
                  className="flex-1 rounded-2xl border-2 border-red-400/60 bg-red-500/5 py-3.5 text-sm font-semibold text-red-600 dark:text-red-400 active:scale-[0.98] transition-transform"
                >
                  💥 Bust (0 p)
                </button>
                <button
                  disabled={directValue === ''}
                  onClick={() => onDirectScore(parseInt(directValue, 10))}
                  className="flex-1 rounded-2xl border-2 border-primary-400 bg-primary-500/10 py-3.5 text-sm font-semibold text-primary-600 dark:text-primary-400 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Rögzítés ✓
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
