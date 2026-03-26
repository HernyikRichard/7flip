// ─────────────────────────────────────────────────────────────────────────────
// SCORE ENGINE — Flip 7: With a Vengeance
// Tiszta függvények, mellékhatás nélkül, tesztelhetők.
//
// Pontszámítás sorrendje (hivatalos szabály szerint):
//  1. numberSum     = számkártyák összege (Lucky 13 × db)
//  2. halvedSum     = ⌊numberSum / 2⌋ ha volt ÷2 modifier, egyébként = numberSum
//  3. baseScore     = halvedSum − modifierPenalty (Classic: min 0, Brutal: negatív is lehet)
//  4. forcedZero    = The Zero esetén körpontszám 0 (kivéve ha Flip 7)
//  5. flip7Bonus    = +15 (Classic) / +20 (Revenge) ha Flip 7 státusz
//  6. total         = baseScore + flip7Bonus   (forcedZero esetén 0 + 0 = 0)
// ─────────────────────────────────────────────────────────────────────────────

import type { RoundPlayerState, ScoreBreakdown } from '@/types/game.types'
import type { GameModeConfig } from '@/types/gameMode.types'
import { CLASSIC_MODE_CONFIG } from './gameModes'

// ── Fő pontszámító függvény ────────────────────────────────────────────────

export function calculateRoundScore(
  state: RoundPlayerState,
  config: GameModeConfig = CLASSIC_MODE_CONFIG
): ScoreBreakdown {

  // ── Bust ────────────────────────────────────────────────────────────────
  if (state.status === 'busted') {
    return calculateBustScore(state, config)
  }

  // ── 1. Számkártyák összege ──────────────────────────────────────────────
  // Lucky 13 mindkét példánya beleszámít (13 + 13 = 26).
  const numberSum = state.numberCards.reduce((s, v) => s + v, 0)

  // ── 2. ÷2 modifier ─────────────────────────────────────────────────────
  const hasDivide2 = state.modifierCards.some((m) => m.modifierType === 'divide2')
  const halvedSum  = hasDivide2 ? Math.floor(numberSum / 2) : numberSum

  // ── 3. Minus modifier-ek összege ────────────────────────────────────────
  const modifierPenalty = state.modifierCards
    .filter((m) => m.modifierType === 'minus')
    .reduce((s, m) => s + (m.value ?? m.minusValue ?? 0), 0)

  // ── 4. Base score ───────────────────────────────────────────────────────
  // Classic és Revenge: nem mehet 0 alá (kivéve Brutal Mode)
  const raw = halvedSum - modifierPenalty
  const baseScore = config.allowNegativeScore ? raw : Math.max(0, raw)

  // ── 5. The Zero hatása ──────────────────────────────────────────────────
  // Ha The Zero a kezében van ÉS nem ért el Flip 7-et: körpontszám = 0
  const isFlip7   = state.status === 'flip7'
  const forcedZero = state.zeroLocked && !isFlip7

  if (forcedZero) {
    return {
      numberSum,
      divide2Applied: hasDivide2,
      halvedSum,
      modifierPenalty,
      baseScore: 0,
      flip7Bonus: 0,
      total: 0,
      busted: false,
      forcedZero: true,
    }
  }

  // ── 6. Flip 7 bónusz ────────────────────────────────────────────────────
  // Brutal: a +15 / −15 choice mechanism-ban kerül alkalmazásra (resolveBrutalFlip7Choice),
  // ezért itt 0-t adunk vissza — a service layer számolja rá a bónuszt/büntetést.
  const flip7Bonus = isFlip7 && !config.brutalFlip7CanPunish ? config.flip7Bonus : 0
  const total      = baseScore + flip7Bonus

  return {
    numberSum,
    divide2Applied: hasDivide2,
    halvedSum,
    modifierPenalty,
    baseScore,
    flip7Bonus,
    total,
    busted: false,
    forcedZero: false,
  }
}

// ── Bust score számítás ────────────────────────────────────────────────────

/**
 * Bust esetén a score a config alapján:
 * - Classic: 0
 * - Revenge: max(−numberSum, −maxBustPenalty)   pl. max(−15, −30) = −15
 */
export function calculateBustScore(
  state: RoundPlayerState,
  config: GameModeConfig = CLASSIC_MODE_CONFIG
): ScoreBreakdown {
  const numberSum = state.numberCards.reduce((s, v) => s + v, 0)
  const bustPenalty = config.maxBustPenalty > 0
    ? Math.max(-numberSum, -config.maxBustPenalty)
    : 0

  return {
    numberSum,
    divide2Applied: false,
    halvedSum: 0,
    modifierPenalty: 0,
    baseScore: bustPenalty,
    flip7Bonus: 0,
    total: bustPenalty,
    busted: true,
    forcedZero: false,
    ...(config.maxBustPenalty > 0 ? { bustPenalty } : {}),
  }
}

// ── Bust ellenőrzés ────────────────────────────────────────────────────────

/**
 * Bustolna-e a játékos, ha megkapja ezt az értéket?
 *
 * Speciális esetek:
 * - Lucky 13 (value === 13): csak a 3. példánynál bustol (lucky13Count >= 2)
 * - Unlucky 7 (value === 7): SOHA nem okoz bustot (a korábbi lapok eldobódnak)
 * - Normal / The Zero: ha már van ugyanilyen értékű lap a kézben
 */
export function wouldBust(state: RoundPlayerState, newValue: number): boolean {
  if (newValue === 7) return false          // Unlucky 7: nincs bust, reset történik
  if (newValue === 13) return state.lucky13Count >= 2  // 3. Lucky 13 bustol
  return state.numberCards.includes(newValue)
}

// ── Flip 7 ellenőrzés ──────────────────────────────────────────────────────

/**
 * 7 különböző számérték van-e a kezében?
 * Lucky 13 dupla példánya csak EGYSZER számít (Set alapján).
 */
export function isFlip7Achieved(numberCards: number[]): boolean {
  return new Set(numberCards).size >= 7
}

// ── Győztes meghatározása ──────────────────────────────────────────────────

export function determineWinner(
  scores: Record<string, number>,
  targetScore: number
): string | null {
  const qualified = Object.entries(scores)
    .filter(([, s]) => s >= targetScore)
    .sort(([, a], [, b]) => b - a)

  if (qualified.length === 0) return null

  // Döntetlen: ha az első két játékosnak ugyanannyi pontja van
  if (qualified.length >= 2 && qualified[0][1] === qualified[1][1]) return null

  return qualified[0][0]
}

// ── Score breakdown → olvasható szöveg (UI) ───────────────────────────────

export function formatScoreBreakdown(b: ScoreBreakdown): string {
  if (b.busted) {
    return b.bustPenalty
      ? `Bust 💥 — ${b.bustPenalty} pont`
      : 'Bust 💥 — 0 pont'
  }

  if (b.forcedZero) return 'The Zero 🎯 — 0 pont'

  const parts: string[] = []
  parts.push(`Számok: ${b.numberSum}`)
  if (b.divide2Applied) {
    parts.push(`÷2 = ${b.halvedSum}`)
  } else if (b.halvedSum !== b.numberSum && b.halvedSum > 0) {
    // Classic ×2 modifier: halvedSum stores the doubled value
    parts.push(`×2 = ${b.halvedSum}`)
  }
  if (b.modifierPenalty)   parts.push(`−${b.modifierPenalty}`)
  if (b.flip7Bonus)        parts.push(`🎉 Flip 7: +${b.flip7Bonus}`)
  parts.push(`= ${b.total} pont`)

  return parts.join('  ·  ')
}

