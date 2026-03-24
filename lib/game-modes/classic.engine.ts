// ─────────────────────────────────────────────────────────────────────────────
// CLASSIC ENGINE
// x2/plus modifier scoring, freeze/flip_three/second_chance actions.
// ─────────────────────────────────────────────────────────────────────────────

import type { GameModeEngine } from '@/types/gameMode.types'
import type { RoundPlayerState, ScoreBreakdown, PendingAction } from '@/types/game.types'
import type { Card } from '@/types/card.types'
import { isNumberCard } from '@/types/card.types'
import { CLASSIC_MODE_CONFIG } from '@/lib/gameModes'
import { wouldBust as wouldBustByValue } from '@/lib/scoreEngine'
import { classicCalculateScore, classicCalculateBustScore } from './classic/score'
import { handleFreeze, handleFlipThree, handleSecondChance } from './classic/actions'
import type { ActionContext } from '@/lib/actionResolver'
import { resolveAction } from '@/lib/actionResolver'

export const classicEngine: GameModeEngine = {
  config: CLASSIC_MODE_CONFIG,

  calculateScore(state: RoundPlayerState): ScoreBreakdown {
    return classicCalculateScore(state, CLASSIC_MODE_CONFIG)
  },

  calculateBustScore(state: RoundPlayerState): ScoreBreakdown {
    return classicCalculateBustScore(state, CLASSIC_MODE_CONFIG)
  },

  wouldBust(card: Card, state: RoundPlayerState): boolean {
    if (!isNumberCard(card)) return false
    return wouldBustByValue(state, card.value)
  },

  resolveAction({ playerStates, action }: {
    playerStates: Record<string, RoundPlayerState>
    action: PendingAction
  }) {
    const ctx: ActionContext = { playerStates, action, config: CLASSIC_MODE_CONFIG }

    if (action.actionType === 'freeze')        return handleFreeze(ctx)
    if (action.actionType === 'flip_three')    return handleFlipThree(ctx)
    if (action.actionType === 'second_chance') return handleSecondChance(ctx)

    // Shared revenge/brutal handlers should not occur in classic — safe fallback
    const result = resolveAction(ctx)
    return {
      updatedStates:      result.updatedStates,
      nextPendingAction:  result.nextPendingAction,
    }
  },
}
