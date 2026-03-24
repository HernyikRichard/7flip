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
import { GAME_MODE_LABELS } from '@/lib/gameModes'
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

  const isFinished     = game.status === 'game_finished'
  const isInRound      = game.status === 'in_round'
  const isRoundDone    = game.status === 'round_finished'
  const isAwaiting     = game.status === 'awaiting_action'
  const winner         = game.players.find((p) => p.uid === game.winnerId)
  const sorted         = [...game.players].sort((a, b) => b.totalScore - a.totalScore)
  const pendingAction  = game.pendingAction
  const allAccepted    = game.players.every((p) => !p.inviteStatus || p.inviteStatus === 'accepted')

  // Flip Four akció: ki a célpont?
  const isFlipFourActive = isAwaiting && pendingAction?.actionType === 'flip_four' && pendingAction.resolvedTargetUid

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
      if (isFlipFourActive && pendingAction?.resolvedTargetUid) {
        await drawCardForPlayer(id, currentRound.id, pendingAction.resolvedTargetUid, card, currentRound.playerStates, gameMode)
        const next = flipFourCount + 1
        if (next < 4) {
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
      if (pendingAction.actionType === 'flip_four') {
        setFlipFourCount(0)
        setPickerForUid(targetUid)
      }
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
  const pickerUidForNumbers = (isFlipFourActive && pendingAction?.resolvedTargetUid)
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
              game.gameMode === 'revenge'
                ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                : 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
            }`}>
              {game.gameMode === 'revenge' ? '💀' : '🎯'} {GAME_MODE_LABELS[game.gameMode ?? 'classic']}
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
        {(isInRound || isAwaiting) && currentRound && (
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
            </div>

            {game.players.map((player) => {
              const state = currentRound.playerStates[player.uid]
              if (!state) return null
              const isFlipFourTarget = !!(
                pendingAction?.actionType === 'flip_four' &&
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

            {isInRound && user.uid === game.createdBy && (
              <Button variant="secondary" fullWidth onClick={handleForceFinishRound} loading={busy}>
                Kör lezárása (manuális)
              </Button>
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
            isFlipFourActive && pendingAction?.resolvedTargetUid
              ? `${pickerPlayer.displayName} (Flip Four — ${flipFourCount + 1}/4)`
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
