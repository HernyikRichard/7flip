import type { ActionType, ModifierType, NumberCardVariant } from '@/types/card.types'

// ── Játékos státusz labelek ────────────────────────────────────────────────

export const PLAYER_STATUS_LABELS = {
  active:  'Aktív',
  stayed:  'Megállt',
  busted:  'Bust 💥',
  flip7:   'Flip 7! 🎉',
} as const

// ── Akciókártyák megjelenítési neve ───────────────────────────────────────

export const ACTION_CARD_LABELS: Record<ActionType, string> = {
  just_one_more: '➕ Just One More',
  swap:          '🔀 Swap',
  steal:         '🫳 Steal',
  discard:       '🗑️ Discard',
  flip_four:     '🔄 Flip Four',
}

// ── Akciókártyák UI-stílusa ────────────────────────────────────────────────

export const ACTION_CARD_COLORS: Record<ActionType, string> = {
  just_one_more: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300',
  swap:          'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300',
  steal:         'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-300',
  discard:       'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300',
  flip_four:     'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300',
}

// ── Módosítókártyák megjelenítési neve ────────────────────────────────────

export const MODIFIER_CARD_LABELS: Record<ModifierType, string> = {
  divide2: '÷2',
  minus:   '−',
}

// ── Módosítókártyák UI-stílusa ─────────────────────────────────────────────

export const MODIFIER_CARD_COLORS: Record<ModifierType, string> = {
  divide2: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300',
  minus:   'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300',
}

// ── Számkártyák UI-stílusa ────────────────────────────────────────────────

export const NUMBER_CARD_COLOR = 'bg-surface text-foreground border-border'

export const SPECIAL_NUMBER_COLORS: Record<NumberCardVariant, string> = {
  normal:   NUMBER_CARD_COLOR,
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

// ── Action card rövid leírása (UI tooltiphez) ──────────────────────────────

export const ACTION_CARD_DESCRIPTIONS: Record<ActionType, string> = {
  just_one_more: 'Célpont kap 1 lapot, majd stayed lesz',
  swap:          'Két face-up lap helyet cserél (bustot okozhat)',
  steal:         'Egy face-up lapot elveszel a saját kezedhez',
  discard:       'Célpont egy lapját eldobod',
  flip_four:     'Célpont kap 4 lapot egyenként',
}
