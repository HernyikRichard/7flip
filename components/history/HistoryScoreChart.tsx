'use client'

import type { Round, GamePlayer } from '@/types'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#a855f7']

interface Props {
  rounds: Round[]
  players: GamePlayer[]
  targetScore: number
}

export default function HistoryScoreChart({ rounds, players, targetScore }: Props) {
  const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber)
  if (sorted.length === 0) return null

  // Kumulatív pontszámok: [0, r1_után, r2_után, ...]
  const progressions: Record<string, number[]> = {}
  const cumulative: Record<string, number> = {}
  players.forEach((p) => { progressions[p.uid] = [0]; cumulative[p.uid] = 0 })

  sorted.forEach((round) => {
    players.forEach((p) => {
      const score = round.playerStates[p.uid]?.roundScore ?? 0
      cumulative[p.uid] = (cumulative[p.uid] ?? 0) + score
      progressions[p.uid].push(cumulative[p.uid])
    })
  })

  const W = 360
  const H = 150
  const pL = 32, pR = 10, pT = 10, pB = 22
  const cW = W - pL - pR
  const cH = H - pT - pB
  const N = sorted.length

  const allScores = Object.values(progressions).flat()
  const maxScore = Math.max(targetScore, ...allScores, 1)

  const xPos = (i: number) => pL + (i / N) * cW
  const yPos = (s: number) => pT + cH - (s / maxScore) * cH

  const gridLabels = [0, Math.round(maxScore * 0.5), maxScore]

  return (
    <div className="flex flex-col gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden="true">
        {/* Grid vonalak + y-tengelycímkék */}
        {gridLabels.map((s) => (
          <g key={s}>
            <line
              x1={pL} y1={yPos(s)} x2={W - pR} y2={yPos(s)}
              stroke="currentColor" strokeOpacity={0.08} strokeWidth={1}
            />
            <text
              x={pL - 4} y={yPos(s) + 3}
              textAnchor="end" fontSize={8}
              fill="currentColor" fillOpacity={0.45}
            >
              {s}
            </text>
          </g>
        ))}

        {/* Célpontszám vonal */}
        <line
          x1={pL} y1={yPos(targetScore)}
          x2={W - pR} y2={yPos(targetScore)}
          stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 3" opacity={0.65}
        />
        <text
          x={W - pR} y={yPos(targetScore) - 3}
          textAnchor="end" fontSize={7}
          fill="#f59e0b" fillOpacity={0.8}
        >
          cél: {targetScore}
        </text>

        {/* X-tengely körcímkék */}
        {sorted.map((_, i) => (
          <text
            key={i}
            x={xPos(i + 1)} y={H - 5}
            textAnchor="middle" fontSize={8}
            fill="currentColor" fillOpacity={0.4}
          >
            {i + 1}
          </text>
        ))}

        {/* Játékos vonalak */}
        {players.map((p, pi) => {
          const data = progressions[p.uid] ?? []
          const color = COLORS[pi % COLORS.length]
          if (data.length < 2) return null

          const pts = data.map((s, i) => `${xPos(i)},${yPos(s)}`).join(' ')

          return (
            <g key={p.uid}>
              <polyline
                points={pts}
                fill="none"
                stroke={color}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {data.map((s, i) => (
                <circle key={i} cx={xPos(i)} cy={yPos(s)} r={i === 0 ? 2 : 3.5} fill={color} />
              ))}
            </g>
          )
        })}
      </svg>

      {/* Jelmagyarázat */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {players.map((p, pi) => (
          <div key={p.uid} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[pi % COLORS.length] }}
            />
            {p.displayName.split(' ')[0]}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-4 border-t border-dashed border-amber-400 shrink-0" />
          célpontszám
        </div>
      </div>
    </div>
  )
}
