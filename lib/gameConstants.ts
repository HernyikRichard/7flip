import type { ActionType, ModifierType } from '@/types/card.types'

export const TARGET_SCORE = 200

// Kártyák megjelenítési neve
export const ACTION_CARD_LABELS: Record<ActionType, string> = {
  freeze:         '❄️ Freeze',
  flip_three:     '🔄 Flip Three',
  second_chance:  '🛡️ Second Chance',
}

export const MODIFIER_CARD_LABELS: Record<ModifierType, string> = {
  x2:   '×2',
  plus: '+',
}

// Kártyaszínek az UI-ban
export const ACTION_CARD_COLORS: Record<ActionType, string> = {
  freeze:        'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300',
  flip_three:    'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-300',
  second_chance: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300',
}

export const MODIFIER_CARD_COLORS: Record<ModifierType, string> = {
  x2:   'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300',
  plus: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300',
}

export const NUMBER_CARD_COLOR = 'bg-surface text-foreground border-border'

// Játékos státusz labels
export const PLAYER_STATUS_LABELS = {
  active:   'Aktív',
  standing: 'Megállt',
  busted:   'Bust 💥',
  frozen:   'Frozen ❄️',
  flip7:    'Flip 7! 🎉',
} as const
