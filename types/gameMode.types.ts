// ─────────────────────────────────────────────────────────────────────────────
// JÁTÉKMÓD TÍPUSOK — Classic / Revenge / Brutal
// ─────────────────────────────────────────────────────────────────────────────

export type GameMode = 'classic' | 'revenge' | 'brutal'

// ── Mód konfiguráció (runtime értékek a szabályokhoz) ─────────────────────

export interface GameModeConfig {
  mode: GameMode
  /** Célpontszám */
  targetScore: number
  /** Flip 7 bónusz — Classic/Revenge: 15; Brutal: 15 (a büntetés/bónusz a choice mechanism-ban) */
  flip7Bonus: number
  /** Bust büntetés maximuma — Classic: 0 (nincs), Revenge: 30 (max −30), Brutal: 50 */
  maxBustPenalty: number
  /** Körpontszám mehet 0 alá (Brutal) */
  allowNegativeScore: boolean
  /** Modifier adható busted játékosnak is (Brutal) */
  brutalModifierOnBust: boolean
  /** Flip 7-nél büntethet is (Brutal) */
  brutalFlip7CanPunish: boolean
}

// ── Mód metaadatok (UI megjelenítéshez) ──────────────────────────────────

export interface GameModeMeta {
  mode: GameMode
  label: string
  description: string
  /** Elsődleges szín token (Tailwind class prefix) */
  colorClass: string
  /** Elérhető-e a játék létrehozásakor */
  available: boolean
}

// ── Motor interfész (F2-ben implementálva) ────────────────────────────────

import type { Card } from './card.types'
import type { RoundPlayerState, ScoreBreakdown, PendingAction } from './game.types'

export interface GameModeEngine {
  config: GameModeConfig

  /**
   * Körpontszám kiszámítása a kezünkből.
   */
  calculateScore(state: RoundPlayerState): ScoreBreakdown

  /**
   * Bust esetén járó (büntetés) pontszám.
   */
  calculateBustScore(state: RoundPlayerState): ScoreBreakdown

  /**
   * Megadja, hogy az adott lap hozzáadása bustot okozna-e.
   */
  wouldBust(card: Card, state: RoundPlayerState): boolean

  /**
   * Akciókártya feloldása — módosítja a játékosnál lévő állapotokat.
   */
  resolveAction(params: {
    playerStates: Record<string, RoundPlayerState>
    action: PendingAction
  }): {
    updatedStates: Record<string, RoundPlayerState>
    nextPendingAction: PendingAction | null
  }
}
