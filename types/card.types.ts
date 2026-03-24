// ─────────────────────────────────────────────────────────────────────────────
// KÁRTYA TÍPUSOK — discriminated union
// A kártyafelismerés és a játéklogika egyaránt ezt használja.
// ─────────────────────────────────────────────────────────────────────────────

/** Számkártya — 0-12 közötti érték, duplikát esetén bust */
export interface NumberCard {
  cardType: 'number'
  value: number  // 0–12
}

/** Akciókártya — azonnal kijátszandó, target választható */
export interface ActionCard {
  cardType: 'action'
  actionType: ActionType
}

/** Módosítókártya — a kör végén befolyásolja a pontszámot */
export interface ModifierCard {
  cardType: 'modifier'
  modifierType: ModifierType
  plusValue?: number  // csak 'plus' típusnál: 2 | 4 | 6 | 8 | 10
}

export type ActionType = 'freeze' | 'flip_three' | 'second_chance'

export type ModifierType = 'x2' | 'plus'

/** Unified kártya típus — discriminated union, minden kártyaművelethez ezt használjuk */
export type Card = NumberCard | ActionCard | ModifierCard

// ─────────────────────────────────────────────────────────────────────────────
// TYPE GUARDS — biztonságos narrowing
// ─────────────────────────────────────────────────────────────────────────────

export const isNumberCard  = (c: Card): c is NumberCard  => c.cardType === 'number'
export const isActionCard  = (c: Card): c is ActionCard  => c.cardType === 'action'
export const isModifierCard= (c: Card): c is ModifierCard=> c.cardType === 'modifier'

// ─────────────────────────────────────────────────────────────────────────────
// FIZIKAI PAKLI — referencia
// ─────────────────────────────────────────────────────────────────────────────

/** A kártyafelismerőhöz és a manuális bevitelhez: minden lehetséges kártya */
export const DECK_DEFINITION: Card[] = [
  // Számkártyák — 0-12, több példányban (összesen 104 lap)
  ...[0,1,2,3,4,5,6,7,8,9,10,11,12].flatMap((v) =>
    Array(8).fill({ cardType: 'number', value: v } as NumberCard)
  ),
  // Akciókártyák
  ...Array(4).fill({ cardType: 'action', actionType: 'freeze'        } as ActionCard),
  ...Array(4).fill({ cardType: 'action', actionType: 'flip_three'    } as ActionCard),
  ...Array(4).fill({ cardType: 'action', actionType: 'second_chance' } as ActionCard),
  // Módosítókártyák
  ...Array(3).fill({ cardType: 'modifier', modifierType: 'x2'              } as ModifierCard),
  ...([2,4,6,8,10] as const).flatMap((v) =>
    Array(3).fill({ cardType: 'modifier', modifierType: 'plus', plusValue: v } as ModifierCard)
  ),
]
