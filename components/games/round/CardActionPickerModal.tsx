'use client'

import Avatar from '@/components/ui/Avatar'
import type { PendingAction, GamePlayer, RoundPlayerState, CardRef } from '@/types'
import type { Card, ModifierCard } from '@/types/card.types'
import { cn } from '@/lib/utils'

interface CardActionPickerModalProps {
  pendingAction: PendingAction
  players: GamePlayer[]
  playerStates: Record<string, RoundPlayerState>
  /** Swap esetén az első lépésben kiválasztott forrás kártya */
  selectedSource: CardRef | null
  onPick: (cardRef: CardRef) => void
  onCancel: () => void
}

function getCardLabel(card: Card): string {
  if (card.cardType === 'number') return String(card.value)
  if (card.cardType === 'modifier') {
    const mc = card as ModifierCard
    if (mc.modifierType === 'divide2') return '÷2'
    if (mc.modifierType === 'x2') return '×2'
    if (mc.modifierType === 'plus') return `+${mc.value ?? ''}`
    return `−${mc.value ?? (mc as ModifierCard & { minusValue?: number }).minusValue ?? ''}`
  }
  return '?'
}

function isSameRef(a: CardRef | null, b: CardRef): boolean {
  return !!a && a.ownerUid === b.ownerUid && a.handCardIndex === b.handCardIndex
}

export default function CardActionPickerModal({
  pendingAction,
  players,
  playerStates,
  selectedSource,
  onPick,
  onCancel,
}: CardActionPickerModalProps) {
  const isSwap = pendingAction.actionType === 'swap'

  const title = isSwap
    ? (selectedSource ? '🔄 Swap — válassz célt' : '🔄 Swap — válassz forrást')
    : pendingAction.actionType === 'steal'
    ? '🫳 Steal — melyik lapot veszed el?'
    : `🗑️ Discard — ${players.find((p) => p.uid === pendingAction.resolvedTargetUid)?.displayName ?? '?'} melyik lapját dobod el?`

  // Kártyák csoportosítva tulajdonos szerint
  const byOwner = new Map<string, CardRef[]>()
  for (const cardRef of pendingAction.availableCards) {
    const list = byOwner.get(cardRef.ownerUid) ?? []
    list.push(cardRef)
    byOwner.set(cardRef.ownerUid, list)
  }

  if (pendingAction.availableCards.length === 0) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col justify-end bg-black/50 backdrop-blur-sm">
        <div className="bg-surface rounded-t-3xl border-t border-border flex flex-col">
          <div className="flex justify-center pt-2.5 pb-1">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>
          <div className="px-5 pt-2 pb-6 flex flex-col gap-4">
            <p className="font-bold text-foreground text-base">{title}</p>
            <p className="text-sm text-muted-foreground">Nincs elérhető face-up kártya — az akció hatástalan.</p>
            <button
              onClick={onCancel}
              className="w-full rounded-2xl border-2 border-border bg-muted py-3 text-sm font-semibold text-foreground active:scale-[0.98] transition-transform"
            >
              Kihagyás
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col justify-end bg-black/50 backdrop-blur-sm">
      <div
        className="bg-surface rounded-t-3xl border-t border-border flex flex-col"
        style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-2 pb-3">
          <div>
            <p className="font-bold text-foreground text-base">{title}</p>
            {isSwap && !selectedSource && (
              <p className="text-xs text-muted-foreground mt-0.5">1. lépés: forrás lap kiválasztása</p>
            )}
            {isSwap && selectedSource && (
              <p className="text-xs text-primary-500 mt-0.5">2. lépés: cél lap kiválasztása</p>
            )}
          </div>
          <button
            onClick={onCancel}
            className="rounded-xl bg-muted px-3.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors shrink-0"
          >
            Mégse
          </button>
        </div>

        {/* Kártyák tulajdonos szerint csoportosítva */}
        <div className="flex flex-col gap-4 px-5 overflow-y-auto max-h-[50dvh]">
          {[...byOwner.entries()].map(([ownerUid, cardRefs]) => {
            const player = players.find((p) => p.uid === ownerUid)
            return (
              <div key={ownerUid}>
                <div className="flex items-center gap-2 mb-2">
                  {player?.isGuest
                    ? <span className="w-6 h-6 flex items-center justify-center text-sm">👤</span>
                    : <Avatar src={player?.photoURL ?? null} name={player?.displayName ?? ownerUid} size="sm" />
                  }
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {player?.displayName ?? ownerUid}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {cardRefs.map((cardRef) => {
                    const hc = playerStates[cardRef.ownerUid]?.handCards[cardRef.handCardIndex]
                    if (!hc) return null
                    const isSource = isSameRef(selectedSource, cardRef)
                    // Swap: forrás kiválasztva → saját forrás nem lehet cél
                    const isDisabled = isSwap && !!selectedSource && isSameRef(selectedSource, cardRef)

                    return (
                      <button
                        key={`${cardRef.ownerUid}-${cardRef.handCardIndex}`}
                        disabled={isDisabled}
                        onClick={() => onPick(cardRef)}
                        className={cn(
                          'card-chip active:scale-90 transition-all',
                          isSource
                            ? 'border-primary-500 bg-primary-500/20 text-primary-700 dark:text-primary-300 ring-2 ring-primary-400/50'
                            : isDisabled
                            ? 'opacity-30 cursor-not-allowed'
                            : 'border-border bg-surface-elevated text-foreground hover:border-primary-400/60 hover:bg-primary-500/5'
                        )}
                      >
                        {getCardLabel(hc.card)}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
