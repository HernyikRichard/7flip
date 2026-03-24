import type { GameMode, GameModeConfig } from '@/types/gameMode.types'

// ── Mód konfigurációk ──────────────────────────────────────────────────────

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
  targetScore: 200,
  flip7Bonus: 15,
  maxBustPenalty: 30,
  allowNegativeScore: false,
  brutalModifierOnBust: false,
  brutalFlip7CanPunish: false,
}

export const BRUTAL_MODE_CONFIG: GameModeConfig = {
  mode: 'brutal',
  targetScore: 200,
  flip7Bonus: 15,
  maxBustPenalty: 50,
  allowNegativeScore: true,
  brutalModifierOnBust: true,
  brutalFlip7CanPunish: true,
}

// ── Konfig builder ─────────────────────────────────────────────────────────

/**
 * Visszaadja a játékmód konfigurációját.
 * A `brutalMode` boolean paraméter backward-kompatibilitáshoz megmaradt:
 * ha `mode === 'revenge'` és `brutalMode === true`, ugyanazt adja mint `mode === 'brutal'`.
 */
export function getGameModeConfig(
  mode: GameMode = 'classic',
  brutalMode: boolean = false
): GameModeConfig {
  if (mode === 'brutal') return BRUTAL_MODE_CONFIG
  if (mode === 'revenge') return brutalMode ? BRUTAL_MODE_CONFIG : REVENGE_MODE_CONFIG
  // classic
  return brutalMode
    ? { ...CLASSIC_MODE_CONFIG, allowNegativeScore: true, brutalModifierOnBust: true, brutalFlip7CanPunish: true }
    : CLASSIC_MODE_CONFIG
}

// ── UI szövegek ────────────────────────────────────────────────────────────

export const GAME_MODE_LABELS: Record<GameMode, string> = {
  classic: 'Classic',
  revenge: 'Revenge',
  brutal:  'Brutal',
}

export const GAME_MODE_DESCRIPTIONS: Record<GameMode, string> = {
  classic: 'Cél: 200 pont · Bust = 0 · Flip 7: +15',
  revenge: 'Cél: 200 pont · Bust = −pont (max −30) · Flip 7: +15',
  brutal:  'Cél: 200 pont · Bust = −pont (max −50) · negatív megengedett · Flip 7: +15 v. −15',
}
