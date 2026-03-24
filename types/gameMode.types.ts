export type GameMode = 'classic' | 'revenge'

export interface GameModeConfig {
  mode: GameMode
  /** Célpontszám — Classic: 200, Revenge: 150 */
  targetScore: number
  /** Flip 7 bónusz — Classic: 15, Revenge: 20 */
  flip7Bonus: number
  /** Bust büntetés maximuma — Classic: 0 (nincs), Revenge: 30 (max −30) */
  maxBustPenalty: number
  /**
   * Brutal Mode: körpontszám mehet 0 alá.
   * A modifierPenalty meghaladhatja a halvedSum-ot.
   */
  allowNegativeScore: boolean
  /**
   * Brutal Mode: modifier kártya adható busted játékosnak is
   * (a pontszámon nem változtat, de a napló tükrözi)
   */
  brutalModifierOnBust: boolean
  /**
   * Brutal Mode: Flip 7-nél a játékos dönthet:
   * +flip7Bonus magának, VAGY −flip7Bonus egy másik játékostól
   */
  brutalFlip7CanPunish: boolean
}
