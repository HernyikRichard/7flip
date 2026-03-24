'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useGameDetail } from '@/hooks/useGameDetail'
import { startRound, forceFinishGame } from '@/services/game.service'
import {
  drawCardForPlayer,
  drawMultipleCardsForPlayer,
  standPlayer,
  bustPlayerManually,
  setDirectScore,
  resolveActionForTarget,
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
import { ROUTES } from '@/lib/constants'
import { GAME_MODE_META } from '@/lib/game-modes'
import type { Card } from '@/types/card.types'

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
    if (!isInRound || busy) return false
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
      await resolveActionForTarget(id, currentRound.id, pendingAction, targetUid, currentRound.playerStates)
      if (pendingAction.actionType === 'flip_four' || pendingAction.actionType === 'flip_three') {
        setFlipFourCount(0)
        setPickerForUid(targetUid)
      }
    } finally { setBusy(false) }
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
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">{game.roundCount}. kör · Cél: {game.targetScore} pont</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              game.gameMode === 'brutal'
                ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                : game.gameMode === 'revenge'
                ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                : 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
            }`}>
              {GAME_MODE_META[game.gameMode ?? 'classic'].label}
            </span>
          </div>
          <GameStatusBadge status={game.status} />
        </div>

        {/* Győztes */}
        {isFinished && winner && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 px-4 py-4 text-center">
            <p className="text-3xl">🏆</p>
            <p className="font-bold text-amber-700 dark:text-amber-300 mt-1">{winner.displayName}</p>
            <p className="text-sm text-muted-foreground">{winner.totalScore} pont</p>
          </div>
        )}

        {/* Ranglista */}
        {(!isInRound && !isAwaiting) && (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Állás</h2>
            {sorted.map((player, i) => (
              <div key={player.uid} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                player.uid === user.uid ? 'border-primary-300 bg-primary-50 dark:bg-primary-950/50' : 'border-border bg-surface'
              }`}>
                <span className="w-6 text-center font-bold text-sm text-muted-foreground">
                  {i === 0 && isFinished ? '🏆' : `#${i + 1}`}
                </span>
                <Avatar src={player.photoURL} name={player.displayName} size="sm" />
                <span className="flex-1 font-medium text-foreground truncate">
                  {player.displayName} {player.uid === user.uid && '(te)'}
                </span>
                <div className="text-right">
                  <p className="font-bold text-foreground">{player.totalScore}</p>
                  <p className="text-xs text-muted-foreground">pont · {player.roundsPlayed} kör</p>
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
                <Avatar src={p.photoURL} name={p.displayName} size="sm" />
                <span className="flex-1 text-sm text-foreground">{p.displayName}</span>
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

      {/* Pending action: target kiválasztása */}
      {isAwaiting && pendingAction && !pendingAction.resolvedTargetUid && (
        <ActionTargetSheet
          action={pendingAction}
          players={game.players}
          onSelect={handleActionTarget}
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
