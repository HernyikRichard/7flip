'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useGameDetail } from '@/hooks/useGameDetail'
import { startRound, forceFinishGame, rematchGame } from '@/services/game.service'
import {
  drawCardForPlayer,
  drawMultipleCardsForPlayer,
  standPlayer,
  bustPlayerManually,
  setDirectScore,
  resolveActionForTarget,
  selectActionTargetPlayer,
  resolveCardAction,
  resolveBrutalFlip7Choice,
  finishRound,
} from '@/services/round.service'
import { usePresence } from '@/hooks/usePresence'
import TopBar from '@/components/layout/TopBar'
import GameStatusBadge from '@/components/games/GameStatusBadge'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import PlayerRoundRow from '@/components/games/round/PlayerRoundRow'
import CardPickerModal from '@/components/games/round/CardPickerModal'
import ActionTargetSheet from '@/components/games/round/ActionTargetSheet'
import CardActionPickerModal from '@/components/games/round/CardActionPickerModal'
import { ROUTES } from '@/lib/constants'
import { GAME_MODE_META } from '@/lib/game-modes'
import { fireFlip7Confetti } from '@/lib/confetti'
import type { Card } from '@/types/card.types'
import type { CardRef } from '@/types'

export default function GamePage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const router = useRouter()
  const { game, currentRound, loading } = useGameDetail(id)
  const { onlineUids } = usePresence(id)

  const [pickerForUid, setPickerForUid] = useState<string | null>(null)
  const [flipFourCount, setFlipFourCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [rematching, setRematching] = useState(false)
  const [swapSourceCard, setSwapSourceCard] = useState<CardRef | null>(null)

  // ── Flip 7 konfetti ────────────────────────────────────────────────────────
  // Nyomon követjük melyik (roundId + uid) kombóra már sült el konfetti,
  // hogy körváltásnál újra tudjon sülni, de egy körben csak egyszer.
  const firedFlip7Ref = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!currentRound) return
    let fired = false
    Object.entries(currentRound.playerStates).forEach(([uid, state]) => {
      const key = `${currentRound.id}:${uid}`
      if (state.status === 'flip7' && !firedFlip7Ref.current.has(key)) {
        firedFlip7Ref.current.add(key)
        fired = true
      }
    })
    if (fired) fireFlip7Confetti()
  }, [currentRound])

  if (!user) return null
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner size="lg" /></div>
  if (!game) return (
    <div className="flex min-h-screen items-center justify-center flex-col gap-3">
      <p className="text-muted-foreground">Játék nem található.</p>
      <Button variant="secondary" onClick={() => router.push(ROUTES.GAMES)}>Vissza</Button>
    </div>
  )

  const isFinished          = game.status === 'game_finished'
  const isInRound           = game.status === 'in_round'
  const isRoundDone         = game.status === 'round_finished'
  const isAwaiting          = game.status === 'awaiting_action'
  const isBrutalFlip7Choice = game.status === 'awaiting_brutal_flip7'

  // Brutal Flip 7: a chooser az aktuális user-e?
  const brutalFlip7Pending   = currentRound?.pendingBrutalFlip7 ?? null
  const isBrutalFlip7Chooser = isBrutalFlip7Choice &&
    brutalFlip7Pending?.chooserUid === user.uid
  const winner         = game.players.find((p) => p.uid === game.winnerId)
  const sorted         = [...game.players].sort((a, b) => b.totalScore - a.totalScore)
  const pendingAction  = game.pendingAction
  const allAccepted    = game.players.every((p) => !p.inviteStatus || p.inviteStatus === 'accepted')

  // Flip Four / Flip Three akció: ki a célpont?
  const isFlipMultiActive = isAwaiting &&
    (pendingAction?.actionType === 'flip_four' || pendingAction?.actionType === 'flip_three') &&
    pendingAction.resolvedTargetUid
  const flipMultiTotal = pendingAction?.actionType === 'flip_three' ? 3 : 4
  // backward compat
  const isFlipFourActive = isFlipMultiActive

  async function handleStartRound() {
    setBusy(true)
    try { await startRound(id, game!.playerUids) }
    finally { setBusy(false) }
  }

  function canRecordFor(uid: string): boolean {
    if (!isInRound || busy || !game) return false
    const player = game.players.find((p) => p.uid === uid)
    if (player?.isGuest) return user?.uid === game.createdBy
    const isOnline = onlineUids.includes(uid)
    return !isOnline || uid === user?.uid
  }

  const gameMode = game.gameMode ?? 'classic'

  async function handleMultiplePicked(numbers: number[]) {
    if (!currentRound || !pickerForUid) return
    setBusy(true)
    setPickerForUid(null)
    try {
      await drawMultipleCardsForPlayer(id, currentRound.id, pickerForUid, numbers, currentRound.playerStates, gameMode)
    } finally { setBusy(false) }
  }

  async function handleCardPicked(card: Card) {
    if (!currentRound || !pickerForUid) return
    setBusy(true)
    setPickerForUid(null)
    try {
      if (isFlipMultiActive && pendingAction?.resolvedTargetUid) {
        await drawCardForPlayer(id, currentRound.id, pendingAction.resolvedTargetUid, card, currentRound.playerStates, gameMode)
        const next = flipFourCount + 1
        if (next < flipMultiTotal) {
          setFlipFourCount(next)
          setPickerForUid(pendingAction.resolvedTargetUid)
        } else {
          setFlipFourCount(0)
        }
      } else {
        await drawCardForPlayer(id, currentRound.id, pickerForUid, card, currentRound.playerStates, gameMode)
      }
    } finally { setBusy(false) }
  }

  async function handleStand(uid: string) {
    if (!currentRound) return
    setBusy(true)
    try { await standPlayer(id, currentRound.id, uid, currentRound.playerStates) }
    finally { setBusy(false) }
  }

  async function handleBust(uid: string) {
    if (!currentRound) return
    setBusy(true)
    try { await bustPlayerManually(id, currentRound.id, uid, currentRound.playerStates, gameMode) }
    finally { setBusy(false) }
  }

  async function handleDirectScore(uid: string, score: number) {
    if (!currentRound) return
    setPickerForUid(null)
    setBusy(true)
    try { await setDirectScore(id, currentRound.id, uid, score, currentRound.playerStates) }
    finally { setBusy(false) }
  }

  async function handleActionTarget(targetUid: string) {
    if (!currentRound || !pendingAction) return
    setBusy(true)
    try {
      if (pendingAction.actionType === 'discard') {
        // Discard step 1: játékos kiválasztása → pending action frissül, majd kártya kérés
        await selectActionTargetPlayer(id, currentRound.id, pendingAction, targetUid, currentRound.playerStates)
      } else {
        await resolveActionForTarget(id, currentRound.id, pendingAction, targetUid, currentRound.playerStates)
        if (pendingAction.actionType === 'flip_four' || pendingAction.actionType === 'flip_three') {
          setFlipFourCount(0)
          setPickerForUid(targetUid)
        }
      }
    } finally { setBusy(false) }
  }

  async function handleCardActionResolve(sourceCard: CardRef | null, targetCard: CardRef) {
    if (!currentRound || !pendingAction) return
    setBusy(true)
    setSwapSourceCard(null)
    try {
      await resolveCardAction(id, currentRound.id, pendingAction, sourceCard, targetCard, currentRound.playerStates, gameMode)
    } finally { setBusy(false) }
  }

  function handleCardActionPick(cardRef: CardRef) {
    if (!pendingAction) return
    if (pendingAction.actionType === 'swap') {
      if (!swapSourceCard) {
        setSwapSourceCard(cardRef)
      } else {
        handleCardActionResolve(swapSourceCard, cardRef)
      }
    } else {
      // steal vagy discard step 2
      handleCardActionResolve(null, cardRef)
    }
  }

  function handleCardActionCancel() {
    // Swap: forrás kiválasztás resetelése (2. lépésből vissza az 1.-be)
    setSwapSourceCard(null)
    // Discard step 2: nincs könnyű visszalépés — a player kénytelen kártyát választani
  }

  async function handleBrutalFlip7Choice(targetUid: string) {
    if (!currentRound || !brutalFlip7Pending) return
    setBusy(true)
    try {
      await resolveBrutalFlip7Choice(id, currentRound.id, brutalFlip7Pending.chooserUid, targetUid)
    } finally { setBusy(false) }
  }

  async function handleForceFinishRound() {
    if (!currentRound) return
    setBusy(true)
    try { await finishRound(id, currentRound.id) }
    finally { setBusy(false) }
  }

  async function handleRematch() {
    setRematching(true)
    try {
      const newGameId = await rematchGame(id, user!.uid)
      router.push(`/games/${newGameId}`)
    } catch (err) {
      console.error(err)
      setRematching(false)
    }
  }

  async function handleFinishGame() {
    const leader = [...game!.players].sort((a, b) => b.totalScore - a.totalScore)[0]
    if (!leader) return
    setBusy(true)
    setConfirmFinish(false)
    try { await forceFinishGame(id, leader.uid) }
    finally { setBusy(false) }
  }

  const pickerPlayer    = pickerForUid ? game.players.find((p) => p.uid === pickerForUid) : null
  const pickerUidForNumbers = (isFlipMultiActive && pendingAction?.resolvedTargetUid)
    ? pendingAction.resolvedTargetUid
    : pickerForUid
  const existingNumbers = pickerUidForNumbers
    ? (currentRound?.playerStates[pickerUidForNumbers]?.numberCards ?? [])
    : []

  return (
    <>
      <TopBar title="Játék" showBack backHref={ROUTES.GAMES} />
      <div className="px-4 py-4 flex flex-col gap-6 max-w-lg mx-auto pb-24">

        {/* Fejléc */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
              game.gameMode === 'brutal'  ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300' :
              game.gameMode === 'revenge' ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' :
                                            'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
            }`}>
              {GAME_MODE_META[game.gameMode ?? 'classic'].label}
            </span>
            <p className="text-xs text-muted-foreground">{game.roundCount}. kör · {game.targetScore} p</p>
          </div>
          <GameStatusBadge status={game.status} />
        </div>

        {/* Győztes + rematch */}
        {isFinished && winner && (
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/[0.08] border border-amber-200 dark:border-amber-500/30 px-4 py-5 text-center card-shadow">
              <p className="text-4xl">🏆</p>
              <p className="font-bold text-lg text-amber-800 dark:text-amber-200 mt-2">{winner.displayName} nyerte!</p>
              <p className="text-sm text-amber-600 dark:text-amber-400/80 mt-0.5">{winner.totalScore} pont · {game.roundCount} kör</p>
            </div>
            <button
              disabled={rematching}
              onClick={handleRematch}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-primary-400 bg-primary-500/10 py-3.5 text-sm font-bold text-primary-600 dark:text-primary-400 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {rematching ? (
                <>
                  <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Létrehozás...</span>
                </>
              ) : (
                <>
                  <span className="text-base">🔄</span>
                  <span>Visszavágó — ugyanazok, ugyanaz a mód</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Ranglista */}
        {(!isInRound && !isAwaiting) && (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-0.5">Állás</p>
            {sorted.map((player, i) => (
              <div
                key={player.uid}
                className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 card-shadow ${
                  player.uid === user.uid
                    ? 'border-primary-400/50 bg-primary-500/[0.06]'
                    : 'border-border bg-surface'
                }`}
              >
                <span className="w-7 text-center shrink-0">
                  {i === 0 && isFinished ? '🏆' : <span className="text-sm font-bold text-muted-foreground">#{i + 1}</span>}
                </span>
                {player.isGuest
                  ? <span className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-base shrink-0">👤</span>
                  : <Avatar src={player.photoURL} name={player.displayName} size="sm" />
                }
                <span className="flex-1 font-semibold text-[15px] text-foreground truncate leading-tight">
                  {player.displayName}
                  {player.uid === user.uid && <span className="text-xs font-normal text-muted-foreground ml-1">(te)</span>}
                  {player.isGuest && <span className="text-[10px] font-normal text-muted-foreground ml-1">vendég</span>}
                </span>
                <div className="text-right shrink-0">
                  <p className="font-bold tabular-nums text-foreground">
                    {player.totalScore}<span className="text-xs font-normal text-muted-foreground ml-0.5">p</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">{player.roundsPlayed} kör</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Aktív kör */}
        {(isInRound || isAwaiting || isBrutalFlip7Choice) && currentRound && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {game.roundCount}. kör
              </h2>
              {isAwaiting && pendingAction && (
                <span className="text-xs text-warning-600 dark:text-warning-400 font-medium">
                  Döntés szükséges…
                </span>
              )}
              {isBrutalFlip7Choice && (
                <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                  🔥 Flip 7 — Brutal döntés…
                </span>
              )}
            </div>

            {game.players.map((player) => {
              const state = currentRound.playerStates[player.uid]
              if (!state) return null
              const isFlipFourTarget = !!(
                (pendingAction?.actionType === 'flip_four' || pendingAction?.actionType === 'flip_three') &&
                pendingAction.resolvedTargetUid === player.uid
              )
              return (
                <PlayerRoundRow
                  key={player.uid}
                  player={player}
                  state={state}
                  isCurrentUser={player.uid === user.uid}
                  canAct={canRecordFor(player.uid)}
                  flipFourPending={isFlipFourTarget}
                  onAddCard={() => setPickerForUid(player.uid)}
                  onStand={() => handleStand(player.uid)}
                  onBust={() => handleBust(player.uid)}
                />
              )
            })}

            {isInRound && (
              <div className="flex gap-2">
                {/* Scan gomb — csak a saját sorhoz */}
                <Button
                  variant="secondary"
                  onClick={() => router.push(`/games/${id}/scan`)}
                  className="flex-1"
                >
                  📷 Scan
                </Button>
                {user.uid === game.createdBy && (
                  <Button variant="secondary" onClick={handleForceFinishRound} loading={busy} className="flex-1">
                    Kör lezárása
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Kör vége */}
        {isRoundDone && currentRound && (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {game.roundCount}. kör eredménye
            </h2>
            <div className="rounded-2xl border border-border bg-surface divide-y divide-border overflow-hidden">
              {[...game.players].sort((a, b) => {
                const sa = currentRound.playerStates[a.uid]?.roundScore ?? 0
                const sb = currentRound.playerStates[b.uid]?.roundScore ?? 0
                return sb - sa
              }).map((player) => {
                const state = currentRound.playerStates[player.uid]
                if (!state) return null
                return (
                  <div key={player.uid} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={player.photoURL} name={player.displayName} size="sm" />
                      <span className="flex-1 font-medium text-foreground">{player.displayName}</span>
                      <span className="font-bold text-foreground">{state.roundScore ?? '–'} p</span>
                      <span className="text-xs text-muted-foreground ml-1">→ {player.totalScore}</span>
                    </div>
                    {state.scoreBreakdown && (
                      <p className="text-xs text-muted-foreground mt-0.5 pl-10">
                        {state.scoreBreakdown.busted
                          ? state.scoreBreakdown.bustPenalty
                            ? `Bust 💥 (${state.scoreBreakdown.bustPenalty} pont)`
                            : 'Bust 💥'
                          : state.scoreBreakdown.forcedZero
                          ? 'The Zero 🎯 — 0 pont'
                          : [
                              `Számok: ${state.scoreBreakdown.numberSum}`,
                              state.scoreBreakdown.divide2Applied && `÷2 = ${state.scoreBreakdown.halvedSum}`,
                              !state.scoreBreakdown.divide2Applied &&
                                state.scoreBreakdown.halvedSum !== state.scoreBreakdown.numberSum &&
                                `×2 = ${state.scoreBreakdown.halvedSum}`,
                              state.scoreBreakdown.modifierPenalty > 0 && `-${state.scoreBreakdown.modifierPenalty}`,
                              state.scoreBreakdown.flip7Bonus > 0 && `🎉+${state.scoreBreakdown.flip7Bonus}`,
                              `= ${state.scoreBreakdown.total} p`,
                            ].filter(Boolean).join('  ')
                        }
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Lobby */}
        {game.status === 'waiting_for_players' && (
          <div className="rounded-2xl border border-border bg-surface p-4 flex flex-col gap-3">
            <p className="text-sm font-semibold text-foreground">
              {allAccepted ? 'Mindenki kész!' : 'Várakozás a játékosokra…'}
            </p>
            {game.players.map((p) => (
              <div key={p.uid} className="flex items-center gap-3">
                {p.isGuest
                  ? <span className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-base shrink-0">👤</span>
                  : <Avatar src={p.photoURL} name={p.displayName} size="sm" />
                }
                <span className="flex-1 text-sm text-foreground">{p.displayName}</span>
                {p.isGuest && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted rounded-full px-2 py-0.5">Vendég</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Akció gombok */}
        {game.status === 'waiting_for_players' && allAccepted && (
          <Button fullWidth size="lg" onClick={handleStartRound} loading={busy}>
            Első kör indítása
          </Button>
        )}
        {isRoundDone && (
          <Button fullWidth size="lg" onClick={handleStartRound} loading={busy}>
            Következő kör
          </Button>
        )}

        {!isFinished && (
          <Button fullWidth variant="danger" onClick={() => setConfirmFinish(true)} loading={busy}>
            Játék lezárása
          </Button>
        )}

      </div>

      {/* Brutal Flip 7 choice modal */}
      {isBrutalFlip7Choice && brutalFlip7Pending && isBrutalFlip7Chooser && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col justify-end bg-black/50 backdrop-blur-sm"
        >
          <div className="bg-surface rounded-t-3xl border-t border-border flex flex-col">
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="px-4 pt-2 pb-3">
              <p className="font-bold text-foreground text-base">🔥 Flip 7 — Brutal döntés</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Vegyél fel +15 pontot, vagy büntess meg egy játékost −15-tel.
              </p>
            </div>
            <div
              className="flex flex-col gap-2 px-4"
              style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
            >
              {/* +15 magának */}
              <button
                disabled={busy}
                onClick={() => handleBrutalFlip7Choice(brutalFlip7Pending.chooserUid)}
                className="rounded-2xl border-2 border-primary-400 bg-primary-50 dark:bg-primary-950/40 px-4 py-3 text-sm font-semibold text-primary-700 dark:text-primary-300 text-left active:scale-[0.98] transition-transform disabled:opacity-40"
              >
                🎉 +15 pont — magamnak
              </button>
              {/* −15 ellenfélnek */}
              {brutalFlip7Pending.availableTargetUids.map((uid) => {
                const p = game.players.find((pl) => pl.uid === uid)
                if (!p) return null
                return (
                  <button
                    key={uid}
                    disabled={busy}
                    onClick={() => handleBrutalFlip7Choice(uid)}
                    className="rounded-2xl border-2 border-red-300 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300 text-left active:scale-[0.98] transition-transform disabled:opacity-40"
                  >
                    💀 −15 pont — {p.displayName}-nek
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Brutal Flip 7: várakozás más játékos döntésére */}
      {isBrutalFlip7Choice && brutalFlip7Pending && !isBrutalFlip7Chooser && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none">
          <div className="bg-surface rounded-3xl border border-border px-6 py-5 text-center flex flex-col gap-2 shadow-xl">
            <p className="text-2xl">🔥</p>
            <p className="font-bold text-foreground">
              {game.players.find((p) => p.uid === brutalFlip7Pending.chooserUid)?.displayName ?? '?'} dönt…
            </p>
            <p className="text-sm text-muted-foreground">Flip 7 Brutal döntés folyamatban</p>
          </div>
        </div>
      )}

      {/* Pending action: játékos célpont kiválasztása (JOM, Flip Four, Discard step 1, Freeze) */}
      {isAwaiting && pendingAction && pendingAction.requiresTargetPlayer && !pendingAction.resolvedTargetUid && (
        <ActionTargetSheet
          action={pendingAction}
          players={game.players}
          onSelect={handleActionTarget}
        />
      )}

      {/* Swap / Steal / Discard (step 2) — kártya kiválasztása */}
      {isAwaiting && pendingAction && currentRound && (
        pendingAction.actionType === 'swap' ||
        pendingAction.actionType === 'steal' ||
        (pendingAction.actionType === 'discard' && !!pendingAction.resolvedTargetUid)
      ) && (
        <CardActionPickerModal
          pendingAction={pendingAction}
          players={game.players}
          playerStates={currentRound.playerStates}
          selectedSource={swapSourceCard}
          onPick={handleCardActionPick}
          onCancel={handleCardActionCancel}
        />
      )}

      {/* Card picker modal */}
      {pickerForUid && pickerPlayer && (
        <CardPickerModal
          playerName={
            isFlipMultiActive && pendingAction?.resolvedTargetUid
              ? `${pickerPlayer.displayName} (${pendingAction.actionType === 'flip_three' ? 'Flip Three' : 'Flip Four'} — ${flipFourCount + 1}/${flipMultiTotal})`
              : pickerPlayer.displayName
          }
          gameMode={gameMode}
          existingNumbers={existingNumbers}
          onPickMultiple={handleMultiplePicked}
          onPick={handleCardPicked}
          onDirectScore={(score) => handleDirectScore(pickerForUid!, score)}
          onCancel={() => { setPickerForUid(null); setFlipFourCount(0) }}
        />
      )}

      {/* Játék lezárása — megerősítés */}
      {confirmFinish && (() => {
        const leader = [...game.players].sort((a, b) => b.totalScore - a.totalScore)[0]
        return (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 1.5rem', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setConfirmFinish(false)}
          >
            <div
              className="bg-surface rounded-3xl border border-border w-full max-w-sm flex flex-col gap-5 p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center flex flex-col gap-1">
                <p className="text-2xl">🏁</p>
                <p className="font-bold text-foreground text-lg">Játék lezárása?</p>
                <p className="text-sm text-muted-foreground">
                  Győztes:{' '}
                  <span className="font-semibold text-foreground">{leader?.displayName}</span>
                  {' '}({leader?.totalScore} pont)
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button fullWidth variant="danger" onClick={handleFinishGame} loading={busy}>
                  Lezárás
                </Button>
                <Button fullWidth variant="secondary" onClick={() => setConfirmFinish(false)}>
                  Mégse
                </Button>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}
