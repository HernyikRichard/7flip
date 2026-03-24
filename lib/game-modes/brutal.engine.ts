// ─────────────────────────────────────────────────────────────────────────────
// BRUTAL ENGINE — Flip 7: With a Vengeance
// Extends the Revenge engine with the Brutal config (negative scores allowed,
// higher bust penalty, modifier-on-bust, flip7-can-punish).
// ─────────────────────────────────────────────────────────────────────────────

import type { GameModeEngine } from '@/types/gameMode.types'
import type { RoundPlayerState, ScoreBreakdown, PendingAction } from '@/types/game.types'
import type { Card } from '@/types/card.types'
import { isNumberCard } from '@/types/card.types'
import { BRUTAL_MODE_CONFIG } from '@/lib/gameModes'
import {
  calculateRoundScore,
  calculateBustScore as calcBust,
  wouldBust as wouldBustByValue,
} from '@/lib/scoreEngine'
import { resolveAction } from '@/lib/actionResolver'

export const brutalEngine: GameModeEngine = {
  config: BRUTAL_MODE_CONFIG,

  calculateScore(state: RoundPlayerState): ScoreBreakdown {
    return calculateRoundScore(state, BRUTAL_MODE_CONFIG)
  },

  calculateBustScore(state: RoundPlayerState): ScoreBreakdown {
    return calcBust(state, BRUTAL_MODE_CONFIG)
  },

  wouldBust(card: Card, state: RoundPlayerState): boolean {
    if (!isNumberCard(card)) return false
    return wouldBustByValue(state, card.value)
  },

  resolveAction({ playerStates, action }: {
    playerStates: Record<string, RoundPlayerState>
    action: PendingAction
  }) {
    const result = resolveAction({ playerStates, action, config: BRUTAL_MODE_CONFIG })
    return {
      updatedStates:      result.updatedStates,
      nextPendingAction:  result.nextPendingAction,
    }
  },
}
