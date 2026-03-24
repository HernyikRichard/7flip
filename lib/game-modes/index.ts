// ─────────────────────────────────────────────────────────────────────────────
// GAME MODE ENGINE REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

import type { GameMode, GameModeEngine, GameModeMeta } from '@/types/gameMode.types'
import { classicEngine } from './classic.engine'
import { revengeEngine } from './revenge.engine'
import { brutalEngine  } from './brutal.engine'

// ── Engine registry ───────────────────────────────────────────────────────

const ENGINES: Record<GameMode, GameModeEngine> = {
  classic: classicEngine,
  revenge: revengeEngine,
  brutal:  brutalEngine,
}

/**
 * Returns the engine for the given game mode.
 * Use this instead of scattered `if (mode === ...)` checks.
 */
export function getModeEngine(mode: GameMode): GameModeEngine {
  return ENGINES[mode]
}

// ── Metadata registry ─────────────────────────────────────────────────────

export const GAME_MODE_META: Record<GameMode, GameModeMeta> = {
  classic: {
    mode:        'classic',
    label:       'Classic',
    description: 'Cél: 200 pont · Bust = 0 · Flip 7: +15',
    colorClass:  'blue',
    available:   true,
  },
  revenge: {
    mode:        'revenge',
    label:       'Revenge',
    description: 'Cél: 200 pont · Bust = −pont (max −30) · Flip 7: +15',
    colorClass:  'red',
    available:   true,
  },
  brutal: {
    mode:        'brutal',
    label:       'Brutal',
    description: 'Cél: 200 pont · Bust = −pont (max −50) · negatív megengedett · Flip 7: +15 v. −15',
    colorClass:  'orange',
    available:   true,
  },
}

// ── Re-exports ────────────────────────────────────────────────────────────

export { classicEngine, revengeEngine, brutalEngine }
