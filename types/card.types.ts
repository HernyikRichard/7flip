// ─────────────────────────────────────────────────────────────────────────────
// KÁRTYA TÍPUSOK — 7flip: Classic / Revenge / Brutal
// Discriminated union, Firestore-kompatibilis (plain object, nincs method).
// ─────────────────────────────────────────────────────────────────────────────

// ── Számkártyák ────────────────────────────────────────────────────────────

/** Normál számkártya értékeit és a speciális lapokat egységesen kezeli */
export type NumberCardVariant = 'normal' | 'zero' | 'unlucky7' | 'lucky13'

export interface NumberCard {
  cardType: 'number'
  variant: NumberCardVariant
  /**
   * - normal: Classic: 1–12 (nincs 7/13); Revenge/Brutal: 1–13
   * - zero: 0 (The Zero)
   * - unlucky7: 7 (Unlucky 7)
   * - lucky13: 13 (Lucky 13)
   */
  value: number
}

// ── Akciókártyák ───────────────────────────────────────────────────────────

/** Classic módban elérhető akciók */
export type ClassicActionType =
  | 'freeze'         // célpont egy körig nem húzhat (frozen státusz)
  | 'flip_three'     // célpont kap 3 lapot egyenként
  | 'second_chance'  // bust helyett a játékos megmarad (ha van nála second chance)

/** Revenge / Brutal módban elérhető akciók */
export type RevengeActionType =
  | 'just_one_more'  // célpont kap 1 lapot, majd stayed lesz
  | 'swap'           // két face-up lap cseréje (bustot okozhat)
  | 'steal'          // egy face-up lap elvétele a saját kézhez
  | 'discard'        // célpont egy lapját eldobja a kijátszó döntése alapján
  | 'flip_four'      // célpont kap 4 lapot egyenként

export type ActionType = ClassicActionType | RevengeActionType

export interface ActionCard {
  cardType: 'action'
  actionType: ActionType
}

// ── Módosítókártyák ────────────────────────────────────────────────────────

/** Classic módban elérhető módosítók */
export type ClassicModifierType =
  | 'x2'    // körpontszám megduplázódik (Flip 7 esetén is)
  | 'plus'  // fix bónusz hozzáadva (klasszikus pakli szerint)

/** Revenge / Brutal módban elérhető módosítók */
export type RevengeModifierType =
  | 'divide2'  // körpontszám felezve (lefelé kerekítve)
  | 'minus'    // fix büntetés levonva

export type ModifierType = ClassicModifierType | RevengeModifierType

export interface ModifierCard {
  cardType: 'modifier'
  modifierType: ModifierType
  /**
   * Revenge/Brutal 'minus': 2 | 4 | 6 | 8 | 10
   * Classic 'plus': a bónusz értéke
   * Classic 'x2' / Revenge 'divide2': undefined (nincs értéke)
   */
  value?: number
  /**
   * @deprecated Használd a `value` mezőt helyette.
   * Backward compatibility: régi Firestore dokumentumokban 'minus' modifier-nél.
   */
  minusValue?: number
}

// ── Unified kártya ─────────────────────────────────────────────────────────

export type Card = NumberCard | ActionCard | ModifierCard

// ── Kéz-kártya (face-up lap a játékos előtt) ──────────────────────────────

/**
 * Egy konkrét lap a játékos kezében.
 * A handCards tömb indexe (CardRef.handCardIndex) alapján hivatkozható.
 */
export interface HandCard {
  card: Card
  /** Melyik körszámban húzták (napló / history) */
  drawnInRound: number
}

// ── Type guards ────────────────────────────────────────────────────────────

export const isNumberCard    = (c: Card): c is NumberCard   => c.cardType === 'number'
export const isActionCard    = (c: Card): c is ActionCard   => c.cardType === 'action'
export const isModifierCard  = (c: Card): c is ModifierCard => c.cardType === 'modifier'

/** The Zero (value = 0) */
export const isZeroCard  = (c: Card): c is NumberCard & { variant: 'zero' } =>
  c.cardType === 'number' && (c as NumberCard).variant === 'zero'
/** Unlucky 7 — lapok reset, csak a 7 marad */
export const isUnlucky7  = (c: Card): c is NumberCard & { variant: 'unlucky7' } =>
  c.cardType === 'number' && (c as NumberCard).variant === 'unlucky7'
/** Lucky 13 — második példány engedélyezett, harmadik = bust */
export const isLucky13   = (c: Card): c is NumberCard & { variant: 'lucky13' } =>
  c.cardType === 'number' && (c as NumberCard).variant === 'lucky13'

/**
 * Visszaadja a modifier effektív értékét.
 * Backward-kompatibilis: `value ?? minusValue`.
 */
export function getModifierValue(m: ModifierCard): number | undefined {
  return m.value ?? m.minusValue
}

