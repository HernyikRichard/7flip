// ─────────────────────────────────────────────────────────────────────────────
// GAME STATE MACHINE — Flip 7: With a Vengeance
// Tiszta függvények, mellékhatás nélkül.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  RoundPlayerState,
  PendingAction,
  CardRef,
} from '@/types/game.types'
import type { Card, NumberCard, ModifierCard, HandCard } from '@/types/card.types'
import {
  isNumberCard, isActionCard, isModifierCard,
  isUnlucky7, isZeroCard, isLucky13,
} from '@/types/card.types'
import { wouldBust, isFlip7Achieved, calculateRoundScore, calculateBustScore } from './scoreEngine'
import type { GameModeConfig } from '@/types/gameMode.types'
import { CLASSIC_MODE_CONFIG } from './gameModes'

// ─────────────────────────────────────────────────────────────────────────────
// HÚZÁS EREDMÉNYE
// ─────────────────────────────────────────────────────────────────────────────

export type DrawResult =
  | { outcome: 'number_added';    updatedState: RoundPlayerState }
  | { outcome: 'zero_added';      updatedState: RoundPlayerState }  // The Zero
  | { outcome: 'unlucky7_reset';  updatedState: RoundPlayerState; droppedCards: Card[] }
  | { outcome: 'lucky13_ok';      updatedState: RoundPlayerState }  // 2. Lucky 13
  | { outcome: 'busted';          updatedState: RoundPlayerState }
  | { outcome: 'flip7';           updatedState: RoundPlayerState }
  | { outcome: 'modifier_added';  updatedState: RoundPlayerState }
  | { outcome: 'action_pending';  pendingAction: PendingAction; updatedState: RoundPlayerState }

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: handCards → numberCards + modifierCards szinkron
// ─────────────────────────────────────────────────────────────────────────────

export function rebuildCardLists(state: RoundPlayerState): RoundPlayerState {
  const numberCards: number[] = []
  const modifierCards: ModifierCard[] = []

  for (const h of state.handCards) {
    if (isNumberCard(h.card))   numberCards.push((h.card as NumberCard).value)
    if (isModifierCard(h.card)) modifierCards.push(h.card as ModifierCard)
  }

  const lucky13Count = numberCards.filter((v) => v === 13).length
  const zeroLocked   = numberCards.includes(0)

  return { ...state, numberCards, modifierCards, lucky13Count, zeroLocked, forcedHit: zeroLocked }
}

// ─────────────────────────────────────────────────────────────────────────────
// LAP KIOSZTÁSA EGY JÁTÉKOSNAK — fő állapot-átmenet
// ─────────────────────────────────────────────────────────────────────────────

export function applyCardToPlayer(
  card: Card,
  playerState: RoundPlayerState,
  allPlayerStates: Record<string, RoundPlayerState>,
  roundNumber: number,
  config: GameModeConfig = CLASSIC_MODE_CONFIG
): DrawResult {
  // Busted játékos nem kaphat lapot (Brutal Mode: modifier igen, de azt a service kezeli)
  if (playerState.status === 'busted') {
    return { outcome: 'number_added', updatedState: playerState }
  }

  const handCard: HandCard = { card, drawnInRound: roundNumber }

  // ── SZÁMKÁRTYA ────────────────────────────────────────────────────────────
  if (isNumberCard(card)) {

    // ── Unlucky 7: lapok eldobása, csak a 7 marad ───────────────────────
    if (isUnlucky7(card)) {
      const droppedCards = playerState.handCards.map((h) => h.card)
      const updated = rebuildCardLists({
        ...playerState,
        handCards:    [handCard],
        numberCards:  [7],
        modifierCards: [],
        lucky13Count: 0,
        zeroLocked:   false,
        forcedHit:    false,
      })
      return { outcome: 'unlucky7_reset', updatedState: updated, droppedCards }
    }

    // ── Bust ellenőrzés ────────────────────────────────────────────────
    if (wouldBust(playerState, card.value)) {
      // Classic: Second Chance elfogyasztja a bustot
      if (playerState.secondChance) {
        // A lap eldobódik, secondChance elhasználódik, játékos active marad
        return {
          outcome: 'number_added',
          updatedState: { ...playerState, secondChance: false },
        }
      }
      const bustBreakdown = calculateBustScore(playerState, config)
      const updated: RoundPlayerState = {
        ...playerState,
        status:         'busted',
        roundScore:     bustBreakdown.total,
        scoreBreakdown: bustBreakdown,
      }
      return { outcome: 'busted', updatedState: updated }
    }

    // ── The Zero ────────────────────────────────────────────────────────
    if (isZeroCard(card)) {
      const updated = rebuildCardLists({
        ...playerState,
        handCards:  [...playerState.handCards, handCard],
        zeroLocked: true,
      })
      return { outcome: 'zero_added', updatedState: updated }
    }

    // ── Lucky 13 (2. példány) ────────────────────────────────────────────
    if (isLucky13(card) && playerState.lucky13Count === 1) {
      const updated = rebuildCardLists({
        ...playerState,
        handCards: [...playerState.handCards, handCard],
      })
      return { outcome: 'lucky13_ok', updatedState: updated }
    }

    // ── Normál szám hozzáadása ───────────────────────────────────────────
    const newHandCards = [...playerState.handCards, handCard]
    const withCard     = rebuildCardLists({ ...playerState, handCards: newHandCards })

    if (isFlip7Achieved(withCard.numberCards)) {
      const flip7Breakdown = calculateRoundScore({ ...withCard, status: 'flip7' }, config)
      const updated: RoundPlayerState = {
        ...withCard,
        status:         'flip7',
        roundScore:     flip7Breakdown.total,
        scoreBreakdown: flip7Breakdown,
      }
      return { outcome: 'flip7', updatedState: updated }
    }

    return { outcome: 'number_added', updatedState: withCard }
  }

  // ── MÓDOSÍTÓKÁRTYA ────────────────────────────────────────────────────────
  if (isModifierCard(card)) {
    const updated = rebuildCardLists({
      ...playerState,
      handCards: [...playerState.handCards, handCard],
    })
    return { outcome: 'modifier_added', updatedState: updated }
  }

  // ── AKCIÓKÁRTYA ───────────────────────────────────────────────────────────
  if (isActionCard(card)) {
    // Nem-busted játékosok uid-jai (Just One More, Flip Four stb. célpontjai)
    const nonBustedUids = Object.values(allPlayerStates)
      .filter((s) => s.status !== 'busted')
      .map((s) => s.uid)

    // Ha csak egyetlen nem-busted játékos van: önmagára kell kijátszani
    const availableTargetUids =
      nonBustedUids.length === 1 ? [playerState.uid] : nonBustedUids

    // Brutal: Discard is célozhat busted játékost, ha van modifier kártyája
    const discardTargetUids = config.brutalModifierOnBust
      ? [
          ...nonBustedUids,
          ...Object.values(allPlayerStates)
            .filter((s) => s.status === 'busted' && s.modifierCards.length > 0)
            .map((s) => s.uid),
        ]
      : availableTargetUids

    // Face-up kártyák (szám + modifier) az összes nem-busted játékostól.
    // Brutal: busted játékos modifier kártyái is elérhetők (Swap/Steal/Discard számára).
    const availableCards: CardRef[] = []
    for (const [uid, s] of Object.entries(allPlayerStates)) {
      if (s.status === 'busted') {
        if (!config.brutalModifierOnBust) continue
        // Csak modifier kártyák busted játékosoknál
        s.handCards.forEach((h, idx) => {
          if (h.card.cardType === 'modifier') {
            availableCards.push({ ownerUid: uid, handCardIndex: idx })
          }
        })
      } else {
        s.handCards.forEach((h, idx) => {
          if (h.card.cardType === 'number' || h.card.cardType === 'modifier') {
            availableCards.push({ ownerUid: uid, handCardIndex: idx })
          }
        })
      }
    }

    const actionConfig = buildActionConfig(card.actionType, availableTargetUids, discardTargetUids, availableCards)

    const pending: PendingAction = {
      id: crypto.randomUUID(),
      actionType: card.actionType,
      playedByUid: playerState.uid,
      ...actionConfig,
      flipFourRemaining:
        card.actionType === 'flip_four'   ? 4 :
        card.actionType === 'flip_three'  ? 3 : null,
      flipFourCardQueue: [],
      // createdAt: service layer állítja be serverTimestamp()-mal
    }

    return { outcome: 'action_pending', pendingAction: pending, updatedState: playerState }
  }

  // Fallback
  return { outcome: 'number_added', updatedState: playerState }
}

// ── Action config per típus ────────────────────────────────────────────────

function buildActionConfig(
  actionType: import('@/types/card.types').ActionType,
  availableTargetUids: string[],
  discardTargetUids: string[],
  availableCards: CardRef[]
): Pick<
  PendingAction,
  | 'requiresTargetPlayer' | 'availableTargetUids' | 'resolvedTargetUid'
  | 'requiresSourceCard' | 'requiresTargetCard' | 'availableCards'
  | 'resolvedSourceCard' | 'resolvedTargetCard'
> {
  const base = {
    requiresTargetPlayer: false,
    availableTargetUids:  [] as string[],
    resolvedTargetUid:    null,
    requiresSourceCard:   false,
    requiresTargetCard:   false,
    availableCards:       [] as CardRef[],
    resolvedSourceCard:   null,
    resolvedTargetCard:   null,
  }

  switch (actionType) {
    case 'just_one_more':
      return { ...base, requiresTargetPlayer: true, availableTargetUids }

    case 'flip_four':
      return { ...base, requiresTargetPlayer: true, availableTargetUids }

    // Classic actions
    case 'freeze':
      return { ...base, requiresTargetPlayer: true, availableTargetUids }

    case 'flip_three':
      return { ...base, requiresTargetPlayer: true, availableTargetUids }

    case 'second_chance':
      // A kijátszó magának veszi — nincs célpont választás
      return base

    case 'swap':
      // Két kártyát kell kiválasztani (forrás + cél) — nem játékost
      return {
        ...base,
        requiresSourceCard: true,
        requiresTargetCard: true,
        availableCards,
      }

    case 'steal':
      return { ...base, requiresTargetCard: true, availableCards }

    case 'discard':
      // Először a játékost, majd a játékos egyik lapját kell kiválasztani.
      // Brutal: discardTargetUids kiterjesztve busted játékosokra is (modifier lapokért).
      return {
        ...base,
        requiresTargetPlayer: true,
        availableTargetUids: discardTargetUids,
        requiresTargetCard: true,
        availableCards,
      }

    default:
      return base
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AKTÍV JÁTÉKOSOK (nem stayed, nem busted, nem flip7)
// ─────────────────────────────────────────────────────────────────────────────

export function getActivePlayers(
  playerStates: Record<string, RoundPlayerState>
): string[] {
  return Object.values(playerStates)
    .filter((p) => p.status === 'active')
    .map((p) => p.uid)
}

// ─────────────────────────────────────────────────────────────────────────────
// KÖR VÉGE ELLENŐRZÉS
// A kör akkor ér véget, ha mindenki stayed / busted / flip7 státuszban van.
// ─────────────────────────────────────────────────────────────────────────────

export function isRoundOver(
  playerStates: Record<string, RoundPlayerState>
): boolean {
  return Object.values(playerStates).every(
    (p) =>
      p.status === 'stayed' ||
      p.status === 'busted' ||
      p.status === 'flip7'  ||
      p.status === 'frozen'
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// KÖR PONTOZÁSA
// ─────────────────────────────────────────────────────────────────────────────

export function scoreRound(
  playerStates: Record<string, RoundPlayerState>,
  config: GameModeConfig = CLASSIC_MODE_CONFIG
): Record<string, RoundPlayerState> {
  const result: Record<string, RoundPlayerState> = {}

  for (const [uid, state] of Object.entries(playerStates)) {
    // Kézileg beállított közvetlen pont (direct score) marad
    if (
      state.roundScore !== null &&
      state.scoreBreakdown !== null &&
      !state.scoreBreakdown.busted
    ) {
      result[uid] = state
      continue
    }

    // Minden más esetet (bust, flip7, stayed, active) újraszámolunk
    const breakdown = calculateRoundScore(state, config)
    result[uid] = {
      ...state,
      roundScore:     breakdown.total,
      scoreBreakdown: breakdown,
    }
  }

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// ÚJ KÖR INICIALIZÁLÁSA
// ─────────────────────────────────────────────────────────────────────────────

export function initRoundPlayerStates(
  playerUids: string[]
): Record<string, RoundPlayerState> {
  const states: Record<string, RoundPlayerState> = {}
  for (const uid of playerUids) {
    states[uid] = {
      uid,
      status:         'active',
      handCards:      [],
      numberCards:    [],
      modifierCards:  [],
      zeroLocked:     false,
      forcedHit:      false,
      lucky13Count:   0,
      roundScore:     null,
      scoreBreakdown: null,
    }
  }
  return states
}
