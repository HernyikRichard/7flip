import { Timestamp } from 'firebase/firestore'
import type { Card, HandCard, ModifierCard, ActionType } from './card.types'
import type { GameMode } from './gameMode.types'

// ─────────────────────────────────────────────────────────────────────────────
// GAME STATUS
// ─────────────────────────────────────────────────────────────────────────────

export type GameStatus =
  | 'waiting_for_players'   // játék létrehozva, várjuk a játékosokat
  | 'in_round'              // kör folyamatban
  | 'awaiting_action'       // akciókártya kijátszva, resolution folyamatban
  | 'awaiting_brutal_flip7' // Brutal: Flip 7 choice függőben (chooser dönt: +15 v. -15)
  | 'round_finished'        // kör pontozva, eredmény megjelenítve
  | 'game_finished'         // valaki elérte a targetScore-t

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER ÁLLAPOT EGY KÖRBEN
// ─────────────────────────────────────────────────────────────────────────────

export type RoundPlayerStatus =
  | 'active'   // húzhat, vagy megállhat
  | 'stayed'   // megállt — de action cardokat még fogadhat!
  | 'busted'   // duplikát szám → kiesett (vagy Lucky 13 harmadszor)
  | 'flip7'    // 7 különböző számkártyát összegyűjtött → kör vége trigger
  | 'frozen'   // Classic: Freeze kártya hatása — egy körig nem húzhat

export interface RoundPlayerState {
  uid: string
  status: RoundPlayerStatus

  /**
   * Az összes face-up lap a játékos előtt, húzás sorrendben.
   * Ez a SOURCE OF TRUTH — a numberCards és modifierCards ebből van deriválva.
   * A Swap/Steal/Discard handCardIndex alapján hivatkozik ide.
   */
  handCards: HandCard[]

  /** Derivált: csak a számkártya értékek, gyors bust-check-hez */
  numberCards: number[]

  /** Derivált: csak a modifier lapok, pontozáshoz */
  modifierCards: ModifierCard[]

  // ── Speciális állapotflagek ─────────────────────────────────────────────

  /**
   * The Zero a kezében van.
   * Ha true és a játékos NEM ér el Flip 7-et: körpontszám 0 lesz.
   */
  zeroLocked: boolean

  /**
   * The Zero miatt kötelező húzás a saját körben.
   * Stay tiltott, amíg ez true. Húzás után false lesz.
   */
  forcedHit: boolean

  /**
   * Hány Lucky 13-asa van (0, 1 vagy 2).
   * Harmadik 13-asnál bust.
   */
  lucky13Count: number

  /**
   * Classic: Second Chance kártya a kezében — egy bustot megakadályoz.
   * Ha true, a következő bust helyett false lesz (és a kártya eldobódik).
   */
  secondChance?: boolean

  // ── Kör végi pontszám ──────────────────────────────────────────────────

  /** null = még nem pontozva */
  roundScore: number | null
  /** null = még nem pontozva */
  scoreBreakdown: ScoreBreakdown | null
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE BREAKDOWN — a pontszámítás lépései átláthatóan
// ─────────────────────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  /** Számkártyák összege (Lucky 13 × db is beleszámít) */
  numberSum: number
  /** Volt-e ÷2 modifier */
  divide2Applied: boolean
  /** numberSum / 2 (lefelé kerekítve) ha volt ÷2, egyébként == numberSum */
  halvedSum: number
  /** Minus modifier-ek összege (pozitív szám — pl. 4 + 6 = 10) */
  modifierPenalty: number
  /**
   * halvedSum - modifierPenalty
   * Classic: min 0; Brutal Mode: lehet negatív
   */
  baseScore: number
  /** +15 (Classic) / +20 (Revenge) ha Flip 7, egyébként 0 */
  flip7Bonus: number
  /** baseScore + flip7Bonus */
  total: number
  /** true ha bust */
  busted: boolean
  /**
   * The Zero hatása — körpontszám 0 lesz (kivéve ha Flip 7).
   * Ha true és NEM flip7: total = 0.
   */
  forcedZero: boolean
  /**
   * Revenge módban: negatív büntetés értéke (pl. -15).
   * Classic módban: undefined.
   */
  bustPenalty?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// KÁRTYA REFERENCIA — handCards[index] azonosítója
// ─────────────────────────────────────────────────────────────────────────────

export interface CardRef {
  ownerUid: string
  handCardIndex: number
}

// ─────────────────────────────────────────────────────────────────────────────
// FÜGGŐ AKCIÓ — action card kijátszva, resolution folyamatban
// ─────────────────────────────────────────────────────────────────────────────

export interface PendingAction {
  /** UUID — Firestore-kompatibilis, az action resolution azonosítója */
  id: string
  actionType: ActionType
  playedByUid: string

  // ── Játékos célpont (Just One More, Flip Four, Discard, Swap, Steal) ──────
  requiresTargetPlayer: boolean
  /** Választható célpont uid-ok (nem busted, és a szabályok alapján) */
  availableTargetUids: string[]
  resolvedTargetUid: string | null

  // ── Kártya célpont ─────────────────────────────────────────────────────
  /** Swap: forrás kártyát is ki kell választani */
  requiresSourceCard: boolean
  /** Swap, Steal, Discard: cél kártyát ki kell választani */
  requiresTargetCard: boolean
  /** Face-up lapok, amelyek célozhatók */
  availableCards: CardRef[]
  /** Swap: melyik lapját adja (forrás) */
  resolvedSourceCard: CardRef | null
  /** Swap cél / Steal / Discard: melyik lapot érinti */
  resolvedTargetCard: CardRef | null

  // ── Flip Four sorozat ──────────────────────────────────────────────────
  /**
   * Flip Four: hány lap van még hátra (4 → 3 → 2 → 1 → 0).
   * null ha nem flip_four akció.
   */
  flipFourRemaining: number | null
  /**
   * Flip Four közben húzott action/modifier lapok sora.
   * A sorozat végén (ha nincs bust) ezeket kell sorban feloldani.
   */
  flipFourCardQueue: Card[]

  /** A service layer állítja be Firestore serverTimestamp()-mal */
  createdAt?: Timestamp
}

// ─────────────────────────────────────────────────────────────────────────────
// KÖR
// ─────────────────────────────────────────────────────────────────────────────

export interface Round {
  id: string
  roundNumber: number
  status: 'active' | 'finished'
  /** Játékos állapotok — uid → RoundPlayerState */
  playerStates: Record<string, RoundPlayerState>
  pendingAction: PendingAction | null
  /**
   * Brutal mód: Flip 7-nél choice függőben.
   * A chooser dönt: +15 magának VAGY -15 ellenfélnek.
   * null ha nincs függőben lévő choice.
   */
  pendingBrutalFlip7?: { chooserUid: string; availableTargetUids: string[] } | null
  /**
   * Brutal mód: A Flip 7 choice feloldva.
   * targetUid === chooserUid → +15 magának.
   * targetUid !== chooserUid → -15 a célpontnak.
   * null ha nem volt Brutal Flip 7 ebben a körben.
   */
  resolvedBrutalFlip7Choice?: { chooserUid: string; targetUid: string } | null
  /** Körön belüli húzási sorrend */
  turnOrder: string[]
  createdAt: Timestamp
  finishedAt: Timestamp | null
}

// ─────────────────────────────────────────────────────────────────────────────
// JÁTÉKOS (játék szinten, nem körben)
// ─────────────────────────────────────────────────────────────────────────────

export interface GamePlayer {
  uid: string
  displayName: string
  photoURL: string | null
  /** Kumulatív pontszám az összes befejezett körből */
  totalScore: number
  roundsPlayed: number
  inviteStatus: 'pending' | 'accepted' | 'declined'
  /** true ha vendég (nem regisztrált) játékos — a lobby leader irányítja */
  isGuest?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// JÁTÉK
// ─────────────────────────────────────────────────────────────────────────────

export interface Game {
  id: string
  createdBy: string
  status: GameStatus
  /**
   * Játékmód — 'classic' | 'revenge' | 'brutal'.
   * A 'brutal' önálló mód (nem boolean overlay).
   */
  gameMode: GameMode
  /**
   * @deprecated Használd a `gameMode: 'brutal'` értéket helyette.
   * Backward compatibility: régi Firestore dokumentumokban még szerepelhet.
   */
  brutalMode?: boolean
  players: GamePlayer[]
  playerUids: string[]
  roundCount: number
  /** Classic/Revenge/Brutal: 200 */
  targetScore: number
  /** Denormalizált a gyors UI-hoz */
  pendingAction: PendingAction | null
  currentRoundId: string | null
  /**
   * Szabályverziót rögzíti — a jövőbeli migrációkhoz.
   * Jelenlegi: 2
   */
  rulesVersion?: number
  createdAt: Timestamp
  finishedAt: Timestamp | null
  winnerId: string | null
}

export type CreateGameData = {
  createdBy: string
  players: GamePlayer[]
  playerUids: string[]
  gameMode: GameMode
}

