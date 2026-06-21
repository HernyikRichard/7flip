'use client'

import { useMemo } from 'react'
import { TrendingUp, AlertTriangle, Flame, Minus } from 'lucide-react'
import { computeLiveInsights } from '@/lib/liveGameInsights'
import type { Game, Round } from '@/types'
import type { InsightTone } from '@/lib/liveGameInsights'

interface LiveInsightsProps {
  game: Game
  currentRound: Round | null
  max?: number
}

const TONE_CLASSES: Record<InsightTone, string> = {
  neutral:  'bg-muted border-border text-muted-foreground',
  positive: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300',
  warning:  'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-300',
  spicy:    'bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-300',
}

const TONE_ICONS: Record<InsightTone, typeof TrendingUp> = {
  neutral:  Minus,
  positive: TrendingUp,
  warning:  AlertTriangle,
  spicy:    Flame,
}

export default function LiveInsights({ game, currentRound, max = 2 }: LiveInsightsProps) {
  const insights = useMemo(
    () => computeLiveInsights(game, currentRound),
    [game, currentRound],
  )

  const visible = insights.slice(0, max)
  if (visible.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5">
      {visible.map((insight) => {
        const Icon = TONE_ICONS[insight.tone]
        return (
          <div
            key={insight.type}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${TONE_CLASSES[insight.tone]}`}
          >
            <Icon size={12} className="shrink-0 opacity-70" />
            <p className="text-xs font-medium leading-snug">{insight.message}</p>
          </div>
        )
      })}
    </div>
  )
}
