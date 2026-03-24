// ─────────────────────────────────────────────────────────────────────────────
// KÁRTYA TÍPUSOK — Flip 7: With a Vengeance
// Discriminated union, Firestore-kompatibilis (plain object, nincs method).
// ─────────────────────────────────────────────────────────────────────────────

// ── Számkártyák ────────────────────────────────────────────────────────────

/** Normál számkártya értékeit és a speciális lapokat egységesen kezeli */
export type NumberCardVariant = 'normal' | 'zero' | 'unlucky7' | 'lucky13'

export interface NumberCard {
  cardType: 'number'
  variant: NumberCardVariant
  /**
   * - normal: 1–12
   * - zero: 0 (The Zero)
   * - unlucky7: 7 (Unlucky 7)
   * - lucky13: 13 (Lucky 13)
   */
  value: number
}

// ── Akciókártyák ───────────────────────────────────────────────────────────

export type ActionType =
  | 'just_one_more'  // célpont kap 1 lapot, majd stayed lesz
  | 'swap'           // két face-up lap cseréje (bustot okozhat)
  | 'steal'          // egy face-up lap elvétele a saját kézhez
  | 'discard'        // célpont egy lapját eldobja a kijátszó döntése alapján
  | 'flip_four'      // célpont kap 4 lapot egyenként

export interface ActionCard {
  cardType: 'action'
  actionType: ActionType
}

// ── Módosítókártyák ────────────────────────────────────────────────────────

export type ModifierType = 'divide2' | 'minus'

export interface ModifierCard {
  cardType: 'modifier'
  modifierType: ModifierType
  /** Csak 'minus' típusnál: 2 | 4 | 6 | 8 | 10 */
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
export const isSpecialNumber = (c: Card): c is NumberCard =>
  c.cardType === 'number' && c.variant !== 'normal'
/** The Zero (value = 0) */
export const isZeroCard  = (c: Card): c is NumberCard & { variant: 'zero' } =>
  c.cardType === 'number' && (c as NumberCard).variant === 'zero'
/** Unlucky 7 — lapok reset, csak a 7 marad */
export const isUnlucky7  = (c: Card): c is NumberCard & { variant: 'unlucky7' } =>
  c.cardType === 'number' && (c as NumberCard).variant === 'unlucky7'
/** Lucky 13 — második példány engedélyezett, harmadik = bust */
export const isLucky13   = (c: Card): c is NumberCard & { variant: 'lucky13' } =>
  c.cardType === 'number' && (c as NumberCard).variant === 'lucky13'

// ── Pakli definíció (referencia a scan / kártya-picker-hez) ───────────────
// A pontos pakli-összetétel a fizikai játékhoz igazodik.
// Ez a definíció a kártyaválasztó UI-hoz és a scan modulhoz szolgál.

export const DECK_DEFINITION: Card[] = [
  // Normál számkártyák (1–12, 4 db)
  ...[1,2,3,4,5,6,8,9,10,11,12].flatMap((v) =>
    Array(4).fill({ cardType: 'number', variant: 'normal', value: v } as NumberCard)
  ),
  // Speciális számkártyák (4 db mindegyikből)
  ...Array(4).fill({ cardType: 'number', variant: 'zero',     value: 0  } as NumberCard),
  ...Array(4).fill({ cardType: 'number', variant: 'unlucky7', value: 7  } as NumberCard),
  ...Array(4).fill({ cardType: 'number', variant: 'lucky13',  value: 13 } as NumberCard),
  // Akciókártyák
  ...Array(6).fill({ cardType: 'action', actionType: 'just_one_more' } as ActionCard),
  ...Array(4).fill({ cardType: 'action', actionType: 'swap'          } as ActionCard),
  ...Array(4).fill({ cardType: 'action', actionType: 'steal'         } as ActionCard),
  ...Array(4).fill({ cardType: 'action', actionType: 'discard'       } as ActionCard),
  ...Array(4).fill({ cardType: 'action', actionType: 'flip_four'     } as ActionCard),
  // Módosítókártyák
  ...Array(3).fill({ cardType: 'modifier', modifierType: 'divide2' } as ModifierCard),
  ...([2, 4, 6, 8, 10] as const).flatMap((v) =>
    Array(3).fill({ cardType: 'modifier', modifierType: 'minus', minusValue: v } as ModifierCard)
  ),
]
