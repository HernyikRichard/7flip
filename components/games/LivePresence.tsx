'use client'

import { Eye } from 'lucide-react'
import type { GamePresenceEntry } from '@/services/presence.service'

interface LivePresenceProps {
  spectatorEntries: GamePresenceEntry[]
  className?: string
}

export default function LivePresence({ spectatorEntries, className = '' }: LivePresenceProps) {
  const count = spectatorEntries.length
  if (count === 0) return null

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
      </span>
      <Eye size={11} className="text-muted-foreground" />
      <span className="text-[11px] text-muted-foreground font-medium">
        {count} {count === 1 ? 'néző' : 'néző'}
      </span>
    </div>
  )
}
