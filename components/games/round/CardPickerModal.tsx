'use client'

import { useState } from 'react'
import type { Card } from '@/types/card.types'
import {
  ACTION_CARD_LABELS, ACTION_CARD_COLORS,
  MODIFIER_CARD_LABELS, MODIFIER_CARD_COLORS,
  SPECIAL_NUMBER_COLORS, SPECIAL_NUMBER_LABELS,
} from '@/lib/gameConstants'
import type { ClassicActionType, RevengeActionType } from '@/types/card.types'

interface CardPickerModalProps {
  playerName: string
  gameMode?: string
  existingNumbers?: number[]
  onPickMultiple: (numbers: number[]) => void
  onPick: (card: Card) => void
  onDirectScore: (score: number) => void
  onCancel: () => void
}

// Classic: nincs normál 7 és 13 a paklibarban (csak speciális változatuk van)
const CLASSIC_NUMBERS = [1,2,3,4,5,6,8,9,10,11,12]
// Revenge: 7 és 13 normál számkártyaként is előfordul
const REVENGE_NUMBERS  = [1,2,3,4,5,6,7,8,9,10,11,12,13]
const MINUS_VALUES  = [2, 4, 6, 8, 10] as const
const PLUS_VALUES   = [5, 10, 15] as const

const CLASSIC_ACTIONS:  ClassicActionType[]  = ['freeze', 'flip_three', 'second_chance']
const REVENGE_ACTIONS:  RevengeActionType[]  = ['just_one_more', 'swap', 'steal', 'discard', 'flip_four']

type Tab = 'numbers' | 'special' | 'direct'

export default function CardPickerModal({
  playerName,
  gameMode = 'classic',
  existingNumbers = [],
  onPickMultiple,
  onPick,
  onDirectScore,
  onCancel,
}: CardPickerModalProps) {
  const NUMBERS = gameMode === 'revenge' ? REVENGE_NUMBERS : CLASSIC_NUMBERS
  const [tab, setTab] = useState<Tab>('numbers')
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([])
  const [directValue, setDirectValue] = useState('')

  const currentSum = existingNumbers.reduce((s, n) => s + n, 0)

  function toggleNumber(n: number) {
    setSelectedNumbers((prev) => {
      const idx = prev.indexOf(n)
      if (idx !== -1) return prev.filter((_, i) => i !== idx)
      if (prev.length >= 7) return prev
      return [...prev, n]
    })
  }

  function handleConfirmNumbers() {
    if (selectedNumbers.length === 0) return
    onPickMultiple(selectedNumbers)
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-end bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-surface rounded-t-3xl border-t border-border flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Húzócsík */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Fejléc */}
        <div className="flex items-center justify-between px-4 pt-1 pb-3">
          <div>
            <p className="font-semibold text-foreground text-sm">{playerName}</p>
            {existingNumbers.length > 0 && (
              <p className="text-xs text-muted-foreground">
                összeg: <span className="font-semibold text-foreground">{currentSum}</span>
                {'  ·  '}{existingNumbers.length} lap
              </p>
            )}
          </div>
          <button
            onClick={onCancel}
            className="rounded-xl bg-muted px-3 py-1.5 text-sm text-muted-foreground"
          >
            Mégse
          </button>
        </div>

        {/* Tab váltó */}
        <div className="flex mx-4 mb-3 rounded-xl bg-muted p-1 gap-1">
          {(['numbers', 'special', 'direct'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSelectedNumbers([]) }}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                tab === t ? 'bg-surface text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {t === 'numbers' ? 'Számok' : t === 'special' ? 'Akció' : 'Végső pont'}
            </button>
          ))}
        </div>

        {/* Tartalom */}
        <div className="px-4" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>

          {/* ── SZÁMKÁRTYÁK — multi-select ── */}
          {tab === 'numbers' && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-6 gap-2">
                {NUMBERS.map((n) => {
                  const wouldBust = existingNumbers.includes(n)
                  const selIdx = selectedNumbers.indexOf(n)
                  const isSelected = selIdx !== -1
                  const full = selectedNumbers.length >= 7 && !isSelected
                  return (
                    <button
                      key={n}
                      disabled={full}
                      onClick={() => toggleNumber(n)}
                      className={`
                        relative flex flex-col items-center justify-center
                        rounded-xl border-2 aspect-[3/4] text-lg font-bold
                        shadow-sm active:scale-90 transition-transform
                        disabled:opacity-30
                        ${isSelected
                          ? 'border-primary-500 bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 ring-2 ring-primary-400'
                          : wouldBust
                          ? 'border-red-300 bg-red-50 text-red-500 dark:bg-red-950/50 dark:border-red-700 dark:text-red-400'
                          : 'border-border bg-surface text-foreground hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40'
                        }
                      `}
                    >
                      {n}
                      {isSelected && (
                        <span className="absolute -top-1.5 -right-1.5 text-xs leading-none bg-primary-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">
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

              {/* Összesítő és OK */}
              <div className="flex items-center gap-3">
                <p className="flex-1 text-xs text-muted-foreground">
                  {selectedNumbers.length === 0
                    ? 'Jelöld ki a húzott lapokat (max 7)'
                    : `Kijelölve: ${selectedNumbers.join(', ')} (összeg: ${selectedNumbers.reduce((s, n) => s + n, 0)})`
                  }
                </p>
                <button
                  disabled={selectedNumbers.length === 0}
                  onClick={handleConfirmNumbers}
                  className="rounded-2xl border-2 border-primary-400 bg-primary-50 dark:bg-primary-950/40 px-5 py-2.5 text-sm font-bold text-primary-600 dark:text-primary-400 active:scale-[0.98] transition-transform disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  OK
                </button>
              </div>
            </div>
          )}

          {/* ── AKCIÓ + MÓDOSÍTÓKÁRTYÁK ── */}
          {tab === 'special' && (
            <div className="flex flex-col gap-4">

              {/* Speciális számkártyák */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Speciális számkártyák</p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => onPick({ cardType: 'number', variant: 'zero', value: 0 })}
                    className={`rounded-2xl border-2 px-4 py-3 text-sm font-semibold text-left active:scale-[0.98] transition-transform ${SPECIAL_NUMBER_COLORS.zero}`}
                  >
                    {SPECIAL_NUMBER_LABELS.zero} — körpontszám 0 lesz
                  </button>
                  <button
                    onClick={() => onPick({ cardType: 'number', variant: 'unlucky7', value: 7 })}
                    className={`rounded-2xl border-2 px-4 py-3 text-sm font-semibold text-left active:scale-[0.98] transition-transform ${SPECIAL_NUMBER_COLORS.unlucky7}`}
                  >
                    {SPECIAL_NUMBER_LABELS.unlucky7} — lapok resetelése, csak 7 marad
                  </button>
                  <button
                    onClick={() => onPick({ cardType: 'number', variant: 'lucky13', value: 13 })}
                    className={`rounded-2xl border-2 px-4 py-3 text-sm font-semibold text-left active:scale-[0.98] transition-transform ${SPECIAL_NUMBER_COLORS.lucky13}`}
                  >
                    {SPECIAL_NUMBER_LABELS.lucky13} — 2. példány engedett, 3. = bust
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Akciókártyák</p>
                <div className="flex flex-col gap-2">
                  {(gameMode === 'classic' ? CLASSIC_ACTIONS : REVENGE_ACTIONS).map((at) => (
                    <button
                      key={at}
                      onClick={() => onPick({ cardType: 'action', actionType: at })}
                      className={`
                        rounded-2xl border-2 px-4 py-3 text-sm font-semibold text-left
                        active:scale-[0.98] transition-transform
                        ${ACTION_CARD_COLORS[at]}
                      `}
                    >
                      {ACTION_CARD_LABELS[at]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Módosítókártyák</p>
                {gameMode === 'classic' ? (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => onPick({ cardType: 'modifier', modifierType: 'x2' })}
                      className={`rounded-2xl border-2 py-3 text-center font-bold active:scale-95 transition-transform ${MODIFIER_CARD_COLORS.x2}`}
                    >
                      {MODIFIER_CARD_LABELS.x2}
                    </button>
                    {PLUS_VALUES.map((v) => (
                      <button
                        key={v}
                        onClick={() => onPick({ cardType: 'modifier', modifierType: 'plus', value: v })}
                        className={`rounded-2xl border-2 py-3 text-center font-bold active:scale-95 transition-transform ${MODIFIER_CARD_COLORS.plus}`}
                      >
                        +{v}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => onPick({ cardType: 'modifier', modifierType: 'divide2' })}
                      className={`rounded-2xl border-2 py-3 text-center font-bold active:scale-95 transition-transform ${MODIFIER_CARD_COLORS.divide2}`}
                    >
                      {MODIFIER_CARD_LABELS.divide2}
                    </button>
                    {MINUS_VALUES.map((v) => (
                      <button
                        key={v}
                        onClick={() => onPick({ cardType: 'modifier', modifierType: 'minus', value: v })}
                        className={`rounded-2xl border-2 py-3 text-center font-bold active:scale-95 transition-transform ${MODIFIER_CARD_COLORS.minus}`}
                      >
                        -{v}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── VÉGSŐ PONT ── */}
          {tab === 'direct' && (
            <div className="flex flex-col gap-4 py-2">
              <p className="text-xs text-muted-foreground text-center">
                Közvetlen kör-pontszám rögzítése (kártyák mellőzésével)
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
                className="w-full rounded-2xl border-2 border-border bg-surface text-center text-4xl font-bold tabular-nums text-foreground py-4 outline-none focus:border-primary-400"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => onDirectScore(0)}
                  className="flex-1 rounded-2xl border-2 border-red-300 bg-red-50 dark:bg-red-950/40 py-3 text-sm font-semibold text-red-600 dark:text-red-400 active:scale-[0.98] transition-transform"
                >
                  💥 Bust (0 p)
                </button>
                <button
                  disabled={directValue === ''}
                  onClick={() => onDirectScore(parseInt(directValue, 10))}
                  className="flex-1 rounded-2xl border-2 border-primary-400 bg-primary-50 dark:bg-primary-950/40 py-3 text-sm font-semibold text-primary-600 dark:text-primary-400 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
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
