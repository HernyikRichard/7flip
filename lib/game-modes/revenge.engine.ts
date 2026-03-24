// ─────────────────────────────────────────────────────────────────────────────
// REVENGE ENGINE — Flip 7: With a Vengeance
// Wraps the existing scoreEngine + actionResolver with the GameModeEngine interface.
// ─────────────────────────────────────────────────────────────────────────────

import type { GameModeEngine } from '@/types/gameMode.types'
import type { RoundPlayerState, ScoreBreakdown, PendingAction } from '@/types/game.types'
import type { Card } from '@/types/card.types'
import { isNumberCard } from '@/types/card.types'
import { REVENGE_MODE_CONFIG } from '@/lib/gameModes'
import {
  calculateRoundScore,
  calculateBustScore as calcBust,
  wouldBust as wouldBustByValue,
} from '@/lib/scoreEngine'
import { resolveAction } from '@/lib/actionResolver'

export const revengeEngine: GameModeEngine = {
  config: REVENGE_MODE_CONFIG,

  calculateScore(state: RoundPlayerState): ScoreBreakdown {
    return calculateRoundScore(state, REVENGE_MODE_CONFIG)
  },

  calculateBustScore(state: RoundPlayerState): ScoreBreakdown {
    return calcBust(state, REVENGE_MODE_CONFIG)
  },

  wouldBust(card: Card, state: RoundPlayerState): boolean {
    if (!isNumberCard(card)) return false
    return wouldBustByValue(state, card.value)
  },

  resolveAction({ playerStates, action }: {
    playerStates: Record<string, RoundPlayerState>
    action: PendingAction
  }) {
    const result = resolveAction({ playerStates, action, config: REVENGE_MODE_CONFIG })
    return {
      updatedStates:      result.updatedStates,
      nextPendingAction:  result.nextPendingAction,
    }
  },
}
