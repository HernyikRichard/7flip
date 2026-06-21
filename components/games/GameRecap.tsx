'use client'

import { useMemo } from 'react'
import { computeGameRecap, type RecapAward } from '@/lib/gameRecap'
import Avatar from '@/components/ui/Avatar'
import type { Game, Round, GamePlayer } from '@/types'

interface GameRecapProps {
  game: Game
  rounds: Round[]
}

export default function GameRecap({ game, rounds }: GameRecapProps) {
  const recap = useMemo(() => computeGameRecap(game, rounds), [game, rounds])

  if (recap.awards.length === 0) return null

  return (
    <section className="flex flex-col gap-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-0.5">
        Highlightok
      </p>
      <div className="grid grid-cols-2 gap-2">
        {recap.awards.slice(0, 6).map((award) => {
          const player = game.players.find((p) => p.uid === award.playerUid)
          if (!player) return null
          return <AwardCard key={award.type} award={award} player={player} />
        })}
      </div>
    </section>
  )
}

function AwardCard({ award, player }: { award: RecapAward; player: GamePlayer }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-3.5 py-3.5 flex flex-col gap-2.5 card-shadow">
      <div className="flex items-center gap-1.5">
        <span className="text-xl leading-none">{award.icon}</span>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground leading-tight">
          {award.title}
        </p>
      </div>
      <div className="flex items-center gap-2 min-w-0">
        {player.isGuest ? (
          <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm shrink-0">
            👤
          </span>
        ) : (
          <Avatar src={player.photoURL} name={player.displayName} size="sm" />
        )}
        <p className="font-bold text-sm text-foreground truncate leading-tight">
          {player.displayName}
        </p>
      </div>
      <p className="text-xs text-muted-foreground leading-snug">{award.description}</p>
    </div>
  )
}
