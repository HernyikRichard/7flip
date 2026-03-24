// ─────────────────────────────────────────────────────────────────────────────
// TURN EVENT TÍPUSOK
// Append-only napló a rounds/{id}/events subcollection-ben.
// ─────────────────────────────────────────────────────────────────────────────

import { Timestamp } from 'firebase/firestore'
import type { Card } from './card.types'
import type { CardRef, ScoreBreakdown } from './game.types'

export type TurnEventType =
  | 'card_drawn'
  | 'number_card_added'
  | 'special_zero_applied'
  | 'special_unlucky7_reset'
  | 'special_lucky13_ok'
  | 'player_busted'
  | 'player_flip7'
  | 'modifier_added'
  | 'action_card_played'
  | 'action_resolved'
  | 'just_one_more_dealt'
  | 'swap_executed'
  | 'steal_executed'
  | 'discard_executed'
  | 'flip_four_card_dealt'
  | 'flip_four_queue_resolved'
  | 'flip_four_complete'
  | 'player_stayed'
  | 'round_scored'
  | 'round_ended'
  | 'game_ended'

export interface TurnEvent {
  id: string
  eventType: TurnEventType
  actorUid: string | null
  targetUid: string | null
  card: Card | null
  /** Swap/Steal forrás kártya */
  sourceCard: CardRef | null
  /** Swap cél / Steal / Discard érintett kártya */
  targetCard: CardRef | null
  scoreBreakdown: ScoreBreakdown | null
  payload: Record<string, unknown>
  createdAt: Timestamp
}
