import type { RoundPlayerState, ScoreBreakdown } from '@/types/game.types'
import { isModifierCard } from '@/types/card.types'

// ─────────────────────────────────────────────────────────────────────────────
// SCORE ENGINE
// Tiszta függvények — nincsenek mellékhatások, tesztelhetők.
//
// Pontszámítás sorrendje (a szabályok szerint):
//  1. numberSum     = számkártyák összege
//  2. doubledSum    = numberSum × 2 ha van x2 módosító, egyébként numberSum
//  3. modifierBonus = plus módosítók összege (x2 NEM duplázza ezeket)
//  4. flip7Bonus    = +15 ha pontosan 7 különböző számkártya megvan
//  5. total         = doubledSum + modifierBonus + flip7Bonus
// ─────────────────────────────────────────────────────────────────────────────

export function calculateRoundScore(state: RoundPlayerState): ScoreBreakdown {
  // Bustolt játékos → minden 0, azonnal visszatér
  if (state.status === 'busted') {
    return {
      numberSum: 0,
      x2Applied: false,
      doubledSum: 0,
      modifierBonus: 0,
      flip7Bonus: 0,
      total: 0,
      busted: true,
    }
  }

  // 1. Számkártyák összege
  const numberSum = state.numberCards.reduce((sum, v) => sum + v, 0)

  // 2. x2 módosító
  const hasX2 = state.modifiers.some(
    (m) => isModifierCard(m) && m.modifierType === 'x2'
  )
  const doubledSum = hasX2 ? numberSum * 2 : numberSum

  // 3. Plus módosítók összege (x2 NEM duplázza ezeket)
  const modifierBonus = state.modifiers
    .filter((m) => isModifierCard(m) && m.modifierType === 'plus')
    .reduce((sum, m) => sum + ((m as { plusValue?: number }).plusValue ?? 0), 0)

  // 4. Flip 7 bónusz — pontosan 7 különböző szám kell
  //    (mivel duplikát = bust, ha elért idáig, mind egyedi)
  const isFlip7 = state.status === 'flip7' || state.numberCards.length === 7
  const flip7Bonus = isFlip7 ? 15 : 0

  // 5. Végeredmény
  const total = doubledSum + modifierBonus + flip7Bonus

  return {
    numberSum,
    x2Applied: hasX2,
    doubledSum,
    modifierBonus,
    flip7Bonus,
    total,
    busted: false,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// KUMULATÍV ÁLLÁS — egy játékos összes körének összegzése
// ─────────────────────────────────────────────────────────────────────────────

export function calculateTotalScore(roundScores: number[]): number {
  return roundScores.reduce((sum, s) => sum + s, 0)
}

// ─────────────────────────────────────────────────────────────────────────────
// BUST ELLENŐRZÉS — duplikát szám esetén
// ─────────────────────────────────────────────────────────────────────────────

export function wouldBust(currentNumbers: number[], newValue: number): boolean {
  return currentNumbers.includes(newValue)
}

// ─────────────────────────────────────────────────────────────────────────────
// FLIP 7 ELLENŐRZÉS — 7 különböző szám megvan-e
// ─────────────────────────────────────────────────────────────────────────────

export function isFlip7Achieved(numberCards: number[]): boolean {
  const unique = new Set(numberCards)
  return unique.size >= 7
}

// ─────────────────────────────────────────────────────────────────────────────
// KÖRT NYERT-E MÁR VALAKI — győztes meghatározása
// A 200 pont felett: ha döntetlen, a kör folytatódik.
// ─────────────────────────────────────────────────────────────────────────────

export function determineWinner(
  scores: Record<string, number>,
  targetScore: number
): string | null {
  const qualified = Object.entries(scores)
    .filter(([, score]) => score >= targetScore)
    .sort(([, a], [, b]) => b - a)

  if (qualified.length === 0) return null

  // Döntetlen ellenőrzés
  if (qualified.length >= 2 && qualified[0][1] === qualified[1][1]) return null

  return qualified[0][0]  // uid
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE BREAKDOWN → olvasható szöveg (UI-ban)
// ─────────────────────────────────────────────────────────────────────────────

export function formatScoreBreakdown(b: ScoreBreakdown): string {
  if (b.busted) return 'Bust — 0 pont'

  const parts: string[] = []
  parts.push(`Számok: ${b.numberSum}`)
  if (b.x2Applied)     parts.push(`× 2 = ${b.doubledSum}`)
  if (b.modifierBonus) parts.push(`+ módosítók: ${b.modifierBonus}`)
  if (b.flip7Bonus)    parts.push(`+ Flip 7: +${b.flip7Bonus}`)
  parts.push(`= ${b.total} pont`)

  return parts.join('  |  ')
}
