import type { GameMode, GameModeConfig } from '@/types/gameMode.types'

// ── Alap módok (Brutal Mode nélkül) ───────────────────────────────────────

export const CLASSIC_MODE_CONFIG: GameModeConfig = {
  mode: 'classic',
  targetScore: 200,
  flip7Bonus: 15,
  maxBustPenalty: 0,
  allowNegativeScore: false,
  brutalModifierOnBust: false,
  brutalFlip7CanPunish: false,
}

export const REVENGE_MODE_CONFIG: GameModeConfig = {
  mode: 'revenge',
  targetScore: 150,
  flip7Bonus: 20,
  maxBustPenalty: 30,
  allowNegativeScore: false,
  brutalModifierOnBust: false,
  brutalFlip7CanPunish: false,
}

// ── Brutal Mode overlay ────────────────────────────────────────────────────
// Brutal Mode bármely mód tetejére rakható.

export const BRUTAL_CLASSIC_CONFIG: GameModeConfig = {
  ...CLASSIC_MODE_CONFIG,
  allowNegativeScore: true,
  brutalModifierOnBust: true,
  brutalFlip7CanPunish: true,
}

export const BRUTAL_REVENGE_CONFIG: GameModeConfig = {
  ...REVENGE_MODE_CONFIG,
  allowNegativeScore: true,
  brutalModifierOnBust: true,
  brutalFlip7CanPunish: true,
}

// ── Konfig builder ─────────────────────────────────────────────────────────

export function getGameModeConfig(
  mode: GameMode = 'classic',
  brutalMode: boolean = false
): GameModeConfig {
  if (mode === 'revenge') return brutalMode ? BRUTAL_REVENGE_CONFIG : REVENGE_MODE_CONFIG
  return brutalMode ? BRUTAL_CLASSIC_CONFIG : CLASSIC_MODE_CONFIG
}

// ── UI szövegek ────────────────────────────────────────────────────────────

export const GAME_MODE_LABELS: Record<GameMode, string> = {
  classic: 'Classic',
  revenge: 'Revenge',
}

export const GAME_MODE_DESCRIPTIONS: Record<GameMode, string> = {
  classic: 'Cél: 200 pont · Bust = 0 · Flip 7: +15',
  revenge: 'Cél: 150 pont · Bust = −pont (max −30) · Flip 7: +20',
}
