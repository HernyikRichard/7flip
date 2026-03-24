// ─────────────────────────────────────────────────────────────────────────────
// ACTION RESOLVER — Flip 7: With a Vengeance
// Strategy pattern: minden action típusnak saját handler-je van.
// Tiszta függvények, mellékhatás nélkül, tesztelhetők.
// ─────────────────────────────────────────────────────────────────────────────

import type { RoundPlayerState, PendingAction, CardRef, ScoreBreakdown } from '@/types/game.types'
import type { Card, NumberCard, ModifierCard } from '@/types/card.types'
import { isNumberCard, isModifierCard } from '@/types/card.types'
import type { ActionType } from '@/types/card.types'
import type { GameModeConfig } from '@/types/gameMode.types'
import { CLASSIC_MODE_CONFIG } from './gameModes'
import { wouldBust, calculateBustScore } from './scoreEngine'
import { rebuildCardLists } from './gameStateMachine'

// ─────────────────────────────────────────────────────────────────────────────
// TÍPUSOK
// ─────────────────────────────────────────────────────────────────────────────

export interface ActionContext {
  playerStates: Record<string, RoundPlayerState>
  action: PendingAction
  config: GameModeConfig
}

export type ActionEventType =
  | 'just_one_more_dealt'
  | 'swap_executed'
  | 'steal_executed'
  | 'discard_executed'
  | 'player_busted'

export interface ActionEvent {
  eventType: ActionEventType
  actorUid: string
  targetUid: string | null
  card: Card | null
  sourceCard: CardRef | null
  targetCard: CardRef | null
  payload: Record<string, unknown>
}

export interface ActionResult {
  updatedStates: Record<string, RoundPlayerState>
  /** Flip Four: ugyanaz az action csökkentett counterrel; más action: null */
  nextPendingAction: PendingAction | null
  events: ActionEvent[]
  roundOver: boolean
}

type ActionHandler = (ctx: ActionContext) => ActionResult

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function cloneStates(
  states: Record<string, RoundPlayerState>
): Record<string, RoundPlayerState> {
  return JSON.parse(JSON.stringify(states)) as Record<string, RoundPlayerState>
}

function checkRoundOver(states: Record<string, RoundPlayerState>): boolean {
  return Object.values(states).every(
    (s) =>
      s.status === 'stayed' ||
      s.status === 'busted' ||
      s.status === 'flip7'  ||
      s.status === 'frozen'
  )
}

/**
 * Bust-ellenőrzés a kéz lapjai alapján — Swap/Steal után szükséges.
 * Visszaadja a bust ScoreBreakdown-t ha bustolt, null ha nem.
 */
function checkBustAfterCardChange(
  state: RoundPlayerState,
  config: GameModeConfig
): ScoreBreakdown | null {
  if (state.status === 'busted') return null // már busted

  const numbers = state.numberCards
  const seen = new Map<number, number>()
  for (const v of numbers) {
    const count = (seen.get(v) ?? 0) + 1
    seen.set(v, count)
    if (v === 13 && count > 2) return calculateBustScore(state, config)
    if (v !== 13 && count > 1) return calculateBustScore(state, config)
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// JUST ONE MORE
// Célpont kap 1 lapot (a service layer húzza), majd stayed lesz.
// A handler csak jelzi a szándékot — a tényleges lap a service-ben kerül rá.
// ─────────────────────────────────────────────────────────────────────────────

const handleJustOneMore: ActionHandler = ({ playerStates, action }) => {
  const targetUid = action.resolvedTargetUid!
  // A tényleges kártyahúzást a service layer végzi drawCardForPlayer-rel.
  // Az action resolver csak az eseményt naplózza.
  return {
    updatedStates: playerStates,
    nextPendingAction: null,
    events: [{
      eventType: 'just_one_more_dealt',
      actorUid:   action.playedByUid,
      targetUid,
      card:        null,
      sourceCard:  null,
      targetCard:  null,
      payload:     {},
    }],
    roundOver: false,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SWAP
// Két face-up lap helyet cserél. Bustot okozhat.
// ─────────────────────────────────────────────────────────────────────────────

const handleSwap: ActionHandler = ({ playerStates, action, config }) => {
  const { resolvedSourceCard, resolvedTargetCard, playedByUid } = action
  if (!resolvedSourceCard || !resolvedTargetCard) {
    throw new Error('Swap: source és target kártya szükséges')
  }

  const states = cloneStates(playerStates)
  const srcOwner = resolvedSourceCard.ownerUid
  const tgtOwner = resolvedTargetCard.ownerUid
  const srcIdx   = resolvedSourceCard.handCardIndex
  const tgtIdx   = resolvedTargetCard.handCardIndex

  // Csere
  const srcCard = states[srcOwner].handCards[srcIdx]
  const tgtCard = states[tgtOwner].handCards[tgtIdx]
  states[srcOwner].handCards[srcIdx] = tgtCard
  states[tgtOwner].handCards[tgtIdx] = srcCard

  // Derivált listák újraszámolása
  states[srcOwner] = rebuildCardLists(states[srcOwner])
  if (srcOwner !== tgtOwner) states[tgtOwner] = rebuildCardLists(states[tgtOwner])

  const events: ActionEvent[] = [{
    eventType:  'swap_executed',
    actorUid:   playedByUid,
    targetUid:  tgtOwner,
    card:        null,
    sourceCard:  resolvedSourceCard,
    targetCard:  resolvedTargetCard,
    payload:     {},
  }]

  // Bust-ellenőrzés mindkét érintett játékosnál
  const toCheck = srcOwner === tgtOwner ? [srcOwner] : [srcOwner, tgtOwner]
  for (const uid of toCheck) {
    const bustBreakdown = checkBustAfterCardChange(states[uid], config)
    if (bustBreakdown) {
      states[uid] = {
        ...states[uid],
        status:         'busted',
        roundScore:     bustBreakdown.total,
        scoreBreakdown: bustBreakdown,
      }
      events.push({
        eventType:  'player_busted',
        actorUid:   playedByUid,
        targetUid:  uid,
        card:        null,
        sourceCard:  null,
        targetCard:  null,
        payload:     { causedBySwap: true },
      })
    }
  }

  return {
    updatedStates:     states,
    nextPendingAction: null,
    events,
    roundOver:         checkRoundOver(states),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEAL
// Egy face-up lap átkerül a kijátszó kezébe.
// ─────────────────────────────────────────────────────────────────────────────

const handleSteal: ActionHandler = ({ playerStates, action }) => {
  const { playedByUid, resolvedTargetCard } = action
  if (!resolvedTargetCard) throw new Error('Steal: target kártya szükséges')

  const states      = cloneStates(playerStates)
  const tgtOwner    = resolvedTargetCard.ownerUid
  const tgtIdx      = resolvedTargetCard.handCardIndex

  const [stolen] = states[tgtOwner].handCards.splice(tgtIdx, 1)
  states[tgtOwner]  = rebuildCardLists(states[tgtOwner])

  states[playedByUid].handCards.push(stolen)
  states[playedByUid] = rebuildCardLists(states[playedByUid])

  return {
    updatedStates:     states,
    nextPendingAction: null,
    events: [{
      eventType:  'steal_executed',
      actorUid:   playedByUid,
      targetUid:  tgtOwner,
      card:        stolen.card,
      sourceCard:  null,
      targetCard:  resolvedTargetCard,
      payload:     {},
    }],
    roundOver: false,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DISCARD
// Célpont elveszíti a kiválasztott lapot (discard pile-ba kerül).
// ─────────────────────────────────────────────────────────────────────────────

const handleDiscard: ActionHandler = ({ playerStates, action }) => {
  const { playedByUid, resolvedTargetUid, resolvedTargetCard } = action
  if (!resolvedTargetCard || !resolvedTargetUid) {
    throw new Error('Discard: target játékos és kártya szükséges')
  }

  const states   = cloneStates(playerStates)
  const tgtIdx   = resolvedTargetCard.handCardIndex
  const [removed] = states[resolvedTargetUid].handCards.splice(tgtIdx, 1)
  states[resolvedTargetUid] = rebuildCardLists(states[resolvedTargetUid])

  return {
    updatedStates:     states,
    nextPendingAction: null,
    events: [{
      eventType:  'discard_executed',
      actorUid:   playedByUid,
      targetUid:  resolvedTargetUid,
      card:        removed.card,
      sourceCard:  null,
      targetCard:  resolvedTargetCard,
      payload:     {},
    }],
    roundOver: false,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FLIP FOUR
// A service layer hívja minden húzásnál.
// Ha flipFourRemaining > 0: csökkentjük a countert és visszaadjuk a nextPendingAction-t.
// Ha flipFourRemaining === 0: a sorban lévő action/modifier lapokat kell feloldani.
// ─────────────────────────────────────────────────────────────────────────────

const handleFlipFour: ActionHandler = ({ playerStates, action }) => {
  const remaining = (action.flipFourRemaining ?? 4) - 1

  if (remaining > 0) {
    return {
      updatedStates:     playerStates,
      nextPendingAction: { ...action, flipFourRemaining: remaining },
      events: [],
      roundOver: false,
    }
  }

  // 4 lap kiosztva (vagy Flip 7 miatt megállt — azt a service kezeli)
  return {
    updatedStates:     playerStates,
    nextPendingAction: null,
    events: [],
    roundOver: false,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

// Classic action handlers are implemented in F3 (lib/game-modes/classic/).
// Until then, they are not registered here.
const ACTION_HANDLERS: Partial<Record<ActionType, ActionHandler>> = {
  just_one_more: handleJustOneMore,
  swap:          handleSwap,
  steal:         handleSteal,
  discard:       handleDiscard,
  flip_four:     handleFlipFour,
}

export function resolveAction(ctx: ActionContext): ActionResult {
  const handler = ACTION_HANDLERS[ctx.action.actionType]
  if (!handler) throw new Error(`Ismeretlen action: ${ctx.action.actionType}`)
  return handler(ctx)
}

// ─────────────────────────────────────────────────────────────────────────────
// AVAILABLE CARDS FRISSÍTÉSE — target player kiválasztása után (Discard)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Discard action esetén, miután a target játékos ki lett választva:
 * az availableCards frissül a target játékos lapjaira.
 */
export function refineDiscardTargetCards(
  action: PendingAction,
  playerStates: Record<string, RoundPlayerState>
): PendingAction {
  if (action.actionType !== 'discard' || !action.resolvedTargetUid) return action

  const targetState = playerStates[action.resolvedTargetUid]
  if (!targetState) return action

  const cards: CardRef[] = targetState.handCards
    .map((h, idx) => ({
      ownerUid:      action.resolvedTargetUid!,
      handCardIndex: idx,
    }))
    .filter((_, idx) => {
      const h = targetState.handCards[idx]
      return h.card.cardType === 'number' || h.card.cardType === 'modifier'
    })

  return { ...action, availableCards: cards }
}
