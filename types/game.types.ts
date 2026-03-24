import { Timestamp } from 'firebase/firestore'
import type { Card, ModifierCard } from './card.types'

// ─────────────────────────────────────────────────────────────────────────────
// GAME STATE MACHINE ÁLLAPOTOK
// ─────────────────────────────────────────────────────────────────────────────

export type GameStatus =
  | 'waiting_for_players'   // játék létrehozva, még nem indult
  | 'in_round'              // kör folyamatban
  | 'awaiting_action'       // akciókártya kijátszva, target választás folyamatban
  | 'round_finished'        // kör pontozva, eredmény megjelenítve
  | 'game_finished'         // valaki elérte a 200 pontot

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER ÁLLAPOT EGY KÖRBEN
// ─────────────────────────────────────────────────────────────────────────────

export type RoundPlayerStatus =
  | 'active'         // húzhat lapot
  | 'standing'       // megállt, nem kap több lapot (opcionális szabály)
  | 'busted'         // duplikát számkártya → 0 pont
  | 'frozen'         // Freeze akció érte → kiesett e körből
  | 'flip7'          // 7 különböző számkártyát gyűjtött → bónusz

export interface RoundPlayerState {
  uid: string
  status: RoundPlayerStatus
  /** Egyedi számkártyák értékei — max 7, duplikát = bust */
  numberCards: number[]
  /** Módosítók (x2, plus) a körből */
  modifiers: ModifierCard[]
  /** Van-e Second Chance lapja még felhasználatlanul */
  hasSecondChance: boolean
  /** Kör végén kiszámolt pontszám (null = még nem pontozva) */
  roundScore: number | null
  /** Részletes pontszám breakdown (null = még nem pontozva) */
  scoreBreakdown: ScoreBreakdown | null
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE BREAKDOWN — a pontszámítás lépései átláthatóan
// ─────────────────────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  /** Számkártyák összege */
  numberSum: number
  /** x2 módosító volt-e */
  x2Applied: boolean
  /** Számkártyák összege x2 után (ha x2 nincs, == numberSum) */
  doubledSum: number
  /** Plus módosítók összege */
  modifierBonus: number
  /** Flip 7 bónusz: +15 ha 7 különböző szám, egyébként 0 */
  flip7Bonus: number
  /** Végső pontszám = doubledSum + modifierBonus + flip7Bonus */
  total: number
  /** Bustolt-e (ha igen, total == 0) */
  busted: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// AKCIÓKÁRTYA FÜGGŐ DÖNTÉS
// ─────────────────────────────────────────────────────────────────────────────

export interface PendingAction {
  /** Melyik játékos húzta az akciókártyát */
  playedByUid: string
  /** Az akciókártya típusa */
  actionType: 'freeze' | 'flip_three' | 'second_chance'
  /** Lehetséges célpontok (aktív játékosok uid-jai) */
  availableTargets: string[]
  /** Megadott célpont (null = még nem döntött) */
  resolvedTargetUid: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// KÖR
// ─────────────────────────────────────────────────────────────────────────────

export interface Round {
  id: string
  roundNumber: number
  status: 'active' | 'finished'
  /** Játékos állapotok a körben — uid → RoundPlayerState */
  playerStates: Record<string, RoundPlayerState>
  /** Aktuálisan függő akciókártya döntés (null ha nincs) */
  pendingAction: PendingAction | null
  /** Kör elején a húzási sorrend */
  turnOrder: string[]
  createdAt: Timestamp
  finishedAt: Timestamp | null
}

// ─────────────────────────────────────────────────────────────────────────────
// JÁTÉKOS A JÁTÉKBAN (nem körben, hanem játék szinten)
// ─────────────────────────────────────────────────────────────────────────────

export interface GamePlayer {
  uid: string
  displayName: string
  photoURL: string | null
  /** Kumulatív pontszám az összes lejátszott körből */
  totalScore: number
  /** Lejátszott körök száma */
  roundsPlayed: number
  /** Meghívás elfogadási állapota */
  inviteStatus: 'pending' | 'accepted' | 'declined'
}

// ─────────────────────────────────────────────────────────────────────────────
// JÁTÉK
// ─────────────────────────────────────────────────────────────────────────────

export interface Game {
  id: string
  createdBy: string
  status: GameStatus
  players: GamePlayer[]
  playerUids: string[]
  /** Hány kör ment le eddig */
  roundCount: number
  /** Célpontszám (alapértelmezett: 200) */
  targetScore: number
  /** Aktuális függő akció körben (denormalizált a gyors UI-hoz) */
  pendingAction: PendingAction | null
  createdAt: Timestamp
  finishedAt: Timestamp | null
  winnerId: string | null
}

export type CreateGameData = Pick<Game, 'players' | 'playerUids' | 'targetScore'> & {
  createdBy: string
}

// ─────────────────────────────────────────────────────────────────────────────
// ESEMÉNYNAPLÓ — egy körön belüli lépések időrendben
// ─────────────────────────────────────────────────────────────────────────────

export type GameEventType =
  | 'round_started'
  | 'card_drawn'           // játékos kap egy lapot
  | 'player_busted'        // duplikát szám → bust
  | 'second_chance_used'   // second chance felhasználva bust ellen
  | 'action_card_played'   // akciókártya kijátszva (target megnevezve)
  | 'player_frozen'        // freeze hatása
  | 'flip_three_resolved'  // flip three 3 lapja ki lett osztva
  | 'player_flip7'         // 7 különböző szám megvan
  | 'round_scored'         // kör pontozva
  | 'round_ended'
  | 'game_ended'

export interface GameEvent {
  id: string
  eventType: GameEventType
  actorUid: string | null      // ki váltotta ki (null = rendszer)
  targetUid: string | null     // kire vonatkozik
  card: Card | null            // melyik kártya érintett
  payload: Record<string, unknown> // extra adat (pl. scoreBreakdown)
  createdAt: Timestamp
}

// ─────────────────────────────────────────────────────────────────────────────
// JÁTÉK VÉGEREDMÉNY
// ─────────────────────────────────────────────────────────────────────────────

export interface GameResult {
  gameId: string
  winnerId: string
  finalScores: Record<string, number>  // uid → totalScore
  totalRounds: number
  finishedAt: Timestamp
}
