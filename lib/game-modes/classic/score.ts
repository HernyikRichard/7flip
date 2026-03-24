// ─────────────────────────────────────────────────────────────────────────────
// CLASSIC SCORE ENGINE
//
// Classic pontszámítás sorrendje:
//  1. numberSum     = számkártyák összege
//  2. multiplied    = numberSum × 2 ha volt ×2 modifier
//  3. plusBonus     = plus modifier-ek összege
//  4. baseScore     = multiplied + plusBonus  (min 0)
//  5. forcedZero    = The Zero esetén körpontszám 0 (kivéve ha Flip 7)
//  6. flip7Bonus    = +15 ha Flip 7 státusz
//  7. total         = baseScore + flip7Bonus
// ─────────────────────────────────────────────────────────────────────────────

import type { RoundPlayerState, ScoreBreakdown } from '@/types/game.types'
import type { GameModeConfig } from '@/types/gameMode.types'
import { getModifierValue } from '@/types/card.types'
import { CLASSIC_MODE_CONFIG } from '@/lib/gameModes'

export function classicCalculateScore(
  state: RoundPlayerState,
  config: GameModeConfig = CLASSIC_MODE_CONFIG
): ScoreBreakdown {
  if (state.status === 'busted') {
    return classicCalculateBustScore(state, config)
  }

  const numberSum = state.numberCards.reduce((s, v) => s + v, 0)

  const hasX2 = state.modifierCards.some((m) => m.modifierType === 'x2')
  const multiplied = hasX2 ? numberSum * 2 : numberSum

  const plusBonus = state.modifierCards
    .filter((m) => m.modifierType === 'plus')
    .reduce((s, m) => s + (getModifierValue(m) ?? 0), 0)

  const raw = multiplied + plusBonus
  const baseScore = Math.max(0, raw)

  const isFlip7   = state.status === 'flip7'
  const forcedZero = state.zeroLocked && !isFlip7

  if (forcedZero) {
    return {
      numberSum,
      divide2Applied: false,
      halvedSum:      numberSum,
      modifierPenalty: 0,
      baseScore:      0,
      flip7Bonus:     0,
      total:          0,
      busted:         false,
      forcedZero:     true,
    }
  }

  const flip7Bonus = isFlip7 ? config.flip7Bonus : 0
  const total      = baseScore + flip7Bonus

  return {
    numberSum,
    divide2Applied:  false,
    halvedSum:       multiplied,   // reusing halvedSum field to store the x2-applied value
    modifierPenalty: 0,
    baseScore,
    flip7Bonus,
    total,
    busted:      false,
    forcedZero:  false,
  }
}

export function classicCalculateBustScore(
  state: RoundPlayerState,
  _config: GameModeConfig = CLASSIC_MODE_CONFIG
): ScoreBreakdown {
  // Classic bust = 0 points, no penalty
  const numberSum = state.numberCards.reduce((s, v) => s + v, 0)
  return {
    numberSum,
    divide2Applied:  false,
    halvedSum:       0,
    modifierPenalty: 0,
    baseScore:       0,
    flip7Bonus:      0,
    total:           0,
    busted:          true,
    forcedZero:      false,
  }
}
