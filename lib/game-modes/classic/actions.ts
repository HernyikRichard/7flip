// ─────────────────────────────────────────────────────────────────────────────
// CLASSIC ACTION HANDLERS
// freeze / flip_three / second_chance
// ─────────────────────────────────────────────────────────────────────────────

import type { RoundPlayerState } from '@/types/game.types'
import type { ActionContext, ActionResult, ActionEvent } from '@/lib/actionResolver'

// ── FREEZE ────────────────────────────────────────────────────────────────────
// Célpont státusza frozen lesz.
// A frozen játékos nem húzhat, de action cardokat kaphat.
// A kör végén a frozen státuszt stayed-nek kezeli a pontozó.

export function handleFreeze({ playerStates, action }: ActionContext): ActionResult {
  const targetUid = action.resolvedTargetUid
  if (!targetUid) throw new Error('Freeze: target játékos szükséges')

  const target = playerStates[targetUid]
  if (!target) throw new Error(`Freeze: ismeretlen uid: ${targetUid}`)

  const updated: RoundPlayerState = {
    ...target,
    status: 'frozen',
  }

  const updatedStates = { ...playerStates, [targetUid]: updated }

  const event: ActionEvent = {
    eventType:  'action_resolved' as ActionEvent['eventType'],
    actorUid:   action.playedByUid,
    targetUid,
    card:        null,
    sourceCard:  null,
    targetCard:  null,
    payload:     { action: 'freeze' },
  }

  const roundOver = Object.values(updatedStates).every(
    (s) => s.status === 'stayed' || s.status === 'busted' || s.status === 'flip7' || s.status === 'frozen'
  )

  return {
    updatedStates,
    nextPendingAction: null,
    events: [event],
    roundOver,
  }
}

// ── FLIP THREE ────────────────────────────────────────────────────────────────
// Hasonló a Flip Four-hoz, de 3 lapot húz a célpont.
// A service layer kezeli az egyes lapok húzását.

export function handleFlipThree({ playerStates, action }: ActionContext): ActionResult {
  const remaining = (action.flipFourRemaining ?? 3) - 1

  if (remaining > 0) {
    return {
      updatedStates:     playerStates,
      nextPendingAction: { ...action, flipFourRemaining: remaining },
      events: [],
      roundOver: false,
    }
  }

  return {
    updatedStates:     playerStates,
    nextPendingAction: null,
    events: [],
    roundOver: false,
  }
}

// ── SECOND CHANCE ─────────────────────────────────────────────────────────────
// A kijátszó játékos kap egy secondChance flag-et.
// A flag elhasználódik, ha a játékos bustolna — a bust helyett a lap eldobódik
// és a játékos active marad.
// Megjegyzés: a flag alkalmazása a gameStateMachine.ts applyCardToPlayer-ben van.

export function handleSecondChance({ playerStates, action }: ActionContext): ActionResult {
  const actorUid = action.playedByUid
  const actor = playerStates[actorUid]
  if (!actor) throw new Error(`SecondChance: ismeretlen uid: ${actorUid}`)

  const updated: RoundPlayerState = {
    ...actor,
    secondChance: true,
  }

  const event: ActionEvent = {
    eventType:  'action_resolved' as ActionEvent['eventType'],
    actorUid,
    targetUid:  actorUid,
    card:        null,
    sourceCard:  null,
    targetCard:  null,
    payload:     { action: 'second_chance' },
  }

  return {
    updatedStates:     { ...playerStates, [actorUid]: updated },
    nextPendingAction: null,
    events: [event],
    roundOver: false,
  }
}

