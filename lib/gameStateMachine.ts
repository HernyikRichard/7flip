import type {
  RoundPlayerState,
  RoundPlayerStatus,
  PendingAction,
  Round,
} from '@/types/game.types'
import type { Card } from '@/types/card.types'
import { isNumberCard, isActionCard, isModifierCard } from '@/types/card.types'
import { wouldBust, isFlip7Achieved, calculateRoundScore } from './scoreEngine'

// ─────────────────────────────────────────────────────────────────────────────
// HÚZÁS EREDMÉNYE — a service layer ezt kapja vissza, ez alapján ír Firestore-ba
// ─────────────────────────────────────────────────────────────────────────────

export type DrawResult =
  | { outcome: 'number_added';    updatedState: RoundPlayerState }
  | { outcome: 'busted';          updatedState: RoundPlayerState }
  | { outcome: 'second_chance';   updatedState: RoundPlayerState }
  | { outcome: 'flip7';           updatedState: RoundPlayerState }
  | { outcome: 'modifier_added';  updatedState: RoundPlayerState }
  | { outcome: 'action_pending';  pendingAction: PendingAction; updatedState: RoundPlayerState }

// ─────────────────────────────────────────────────────────────────────────────
// LAP KIOSZTÁSA EGY JÁTÉKOSNAK
// Ez a fő állapot-átmenet függvény — tiszta, mellékhatás mentes.
// ─────────────────────────────────────────────────────────────────────────────

export function applyCardToPlayer(
  card: Card,
  playerState: RoundPlayerState,
  activePlayerUids: string[]
): DrawResult {
  // Frozen / busted játékos nem kaphat lapot
  if (playerState.status === 'frozen' || playerState.status === 'busted') {
    return { outcome: 'number_added', updatedState: playerState }
  }

  // ── SZÁMKÁRTYA ──────────────────────────────────────────────────────────────
  if (isNumberCard(card)) {
    const isDuplicate = wouldBust(playerState.numberCards, card.value)

    if (isDuplicate) {
      // Van Second Chance?
      if (playerState.hasSecondChance) {
        // SC felhasználva: nem bustol, de a lapot sem kapja meg
        const updated: RoundPlayerState = {
          ...playerState,
          hasSecondChance: false,
          // Státusz marad 'active' — a következő körben kap lapot
        }
        return { outcome: 'second_chance', updatedState: updated }
      }

      // Bust
      const updated: RoundPlayerState = {
        ...playerState,
        status: 'busted',
        roundScore: 0,
        scoreBreakdown: { numberSum:0, x2Applied:false, doubledSum:0, modifierBonus:0, flip7Bonus:0, total:0, busted:true },
      }
      return { outcome: 'busted', updatedState: updated }
    }

    // Egyedi szám — hozzáadjuk
    const newNumbers = [...playerState.numberCards, card.value]
    const flip7 = isFlip7Achieved(newNumbers)

    const updated: RoundPlayerState = {
      ...playerState,
      numberCards: newNumbers,
      status: flip7 ? 'flip7' : 'active',
    }
    return {
      outcome: flip7 ? 'flip7' : 'number_added',
      updatedState: updated,
    }
  }

  // ── MÓDOSÍTÓKÁRTYA ─────────────────────────────────────────────────────────
  if (isModifierCard(card)) {
    const updated: RoundPlayerState = {
      ...playerState,
      modifiers: [...playerState.modifiers, card],
    }
    return { outcome: 'modifier_added', updatedState: updated }
  }

  // ── AKCIÓKÁRTYA ────────────────────────────────────────────────────────────
  if (isActionCard(card)) {
    // Second Chance: a húzó játékosnál tárolódik (felhasználható bust ellen)
    if (card.actionType === 'second_chance') {
      const updated: RoundPlayerState = {
        ...playerState,
        hasSecondChance: true,
      }
      return { outcome: 'modifier_added', updatedState: updated }
    }

    // Freeze / Flip Three: target választás szükséges
    // Ha csak 1 aktív játékos van, ő maga a target
    const availableTargets =
      activePlayerUids.length === 1
        ? [playerState.uid]
        : activePlayerUids

    const pending: PendingAction = {
      playedByUid: playerState.uid,
      actionType: card.actionType,
      availableTargets,
      resolvedTargetUid: null,
    }
    return { outcome: 'action_pending', pendingAction: pending, updatedState: playerState }
  }

  // Fallback — nem ismert kártya (ne forduljon elő)
  return { outcome: 'number_added', updatedState: playerState }
}

// ─────────────────────────────────────────────────────────────────────────────
// AKCIÓKÁRTYA FELOLDÁSA — miután a target ki lett választva
// ─────────────────────────────────────────────────────────────────────────────

export function resolveAction(
  action: PendingAction,
  targetState: RoundPlayerState
): RoundPlayerState {
  switch (action.actionType) {
    case 'freeze':
      return { ...targetState, status: 'frozen' }

    case 'second_chance':
      // Ezt már az applyCardToPlayer kezeli, ide nem kerülhet
      return targetState

    case 'flip_three':
      // A flip_three-t a service layer kezeli: 3 lapot húz és egyenként alkalmaz
      // Ez az állapot nem változik az akció feloldásakor, a húzások változtatják
      return targetState

    default:
      return targetState
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AKTÍV JÁTÉKOSOK — kiesett (bust, frozen) nélkül
// ─────────────────────────────────────────────────────────────────────────────

export function getActivePlayers(playerStates: Record<string, RoundPlayerState>): string[] {
  return Object.values(playerStates)
    .filter((p) => p.status === 'active' || p.status === 'flip7')
    .map((p) => p.uid)
}

// ─────────────────────────────────────────────────────────────────────────────
// KÖR VÉGE ELLENŐRZÉS
// A kör akkor ér véget, ha minden játékos bust/frozen/flip7 státuszban van.
// ─────────────────────────────────────────────────────────────────────────────

export function isRoundOver(playerStates: Record<string, RoundPlayerState>): boolean {
  return Object.values(playerStates).every(
    (p) => p.status === 'busted' || p.status === 'frozen' || p.status === 'flip7' || p.status === 'standing'
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// KÖR PONTOZÁSA — minden játékos scoreBreakdown-ját kiszámolja
// ─────────────────────────────────────────────────────────────────────────────

export function scoreRound(
  playerStates: Record<string, RoundPlayerState>
): Record<string, RoundPlayerState> {
  const result: Record<string, RoundPlayerState> = {}
  for (const [uid, state] of Object.entries(playerStates)) {
    // Ha már van kézileg beállított roundScore (bust vagy közvetlen pont), azt tartjuk meg
    if (state.roundScore !== null && state.scoreBreakdown !== null) {
      result[uid] = state
      continue
    }
    const breakdown = calculateRoundScore(state)
    result[uid] = {
      ...state,
      roundScore: breakdown.total,
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
      status: 'active',
      numberCards: [],
      modifiers: [],
      hasSecondChance: false,
      roundScore: null,
      scoreBreakdown: null,
    }
  }
  return states
}
