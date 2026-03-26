import type { ActionType, ModifierType, NumberCardVariant } from '@/types/card.types'

// ── Játékos státusz labelek ────────────────────────────────────────────────

export const PLAYER_STATUS_LABELS = {
  active:  'Aktív',
  stayed:  'Megállt',
  busted:  'Bust 💥',
  flip7:   'Flip 7! 🎉',
  frozen:  'Fagyasztva ❄️',
} as const

// ── Akciókártyák megjelenítési neve ───────────────────────────────────────

export const ACTION_CARD_LABELS: Record<ActionType, string> = {
  // Revenge / Brutal
  just_one_more: '➕ Just One More',
  swap:          '🔀 Swap',
  steal:         '🫳 Steal',
  discard:       '🗑️ Discard',
  flip_four:     '🔄 Flip Four',
  // Classic
  freeze:        '❄️ Freeze',
  flip_three:    '🔄 Flip Three',
  second_chance: '🍀 Second Chance',
}

// ── Akciókártyák UI-stílusa ────────────────────────────────────────────────

export const ACTION_CARD_COLORS: Record<ActionType, string> = {
  // Revenge / Brutal
  just_one_more: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300',
  swap:          'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300',
  steal:         'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-300',
  discard:       'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300',
  flip_four:     'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300',
  // Classic
  freeze:        'bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300',
  flip_three:    'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300',
  second_chance: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300',
}

// ── Módosítókártyák megjelenítési neve ────────────────────────────────────

export const MODIFIER_CARD_LABELS: Record<ModifierType, string> = {
  divide2: '÷2',
  minus:   '−',
  x2:      '×2',
  plus:    '+',
}

// ── Módosítókártyák UI-stílusa ─────────────────────────────────────────────

export const MODIFIER_CARD_COLORS: Record<ModifierType, string> = {
  divide2: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300',
  minus:   'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300',
  x2:      'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300',
  plus:    'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300',
}

// ── Számkártyák UI-stílusa ────────────────────────────────────────────────

export const SPECIAL_NUMBER_COLORS: Record<NumberCardVariant, string> = {
  normal:   'bg-surface text-foreground border-border',
  zero:     'bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-950 dark:text-sky-300',
  unlucky7: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300',
  lucky13:  'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300',
}

export const SPECIAL_NUMBER_LABELS: Record<NumberCardVariant, string> = {
  normal:   '',
  zero:     '🎯 The Zero',
  unlucky7: '☠️ Unlucky 7',
  lucky13:  '🍀 Lucky 13',
}

