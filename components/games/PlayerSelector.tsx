'use client'

import Avatar from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import type { FriendshipUser } from '@/types'

interface PlayerSelectorProps {
  friends?: FriendshipUser[] | null
  selected?: FriendshipUser[] | null
  onToggle: (friend: FriendshipUser) => void
  maxPlayers?: number
}

export default function PlayerSelector(props: PlayerSelectorProps) {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!props || typeof props !== 'object') return null
  const friends: FriendshipUser[]  = Array.isArray(props.friends)  ? props.friends  : []
  const selected: FriendshipUser[] = Array.isArray(props.selected) ? props.selected : []
  const maxPlayers = typeof props.maxPlayers === 'number' ? props.maxPlayers : 8

  const isSelected = (uid: string) => selected.some((s) => s?.uid === uid)
  const isFull     = selected.length >= maxPlayers

  if (friends.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-muted px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Még nincs barátod. Adj hozzá barátokat a Barátok oldalon!
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {friends.map((friend) => {
        if (!friend) return null
        const sel      = isSelected(friend.uid)
        const disabled = !sel && isFull

        return (
          <button
            key={friend.uid}
            type="button"
            onClick={() => !disabled && props.onToggle(friend)}
            className={cn(
              'flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left',
              'transition-all active:scale-[0.98] min-h-[56px]',
              sel      ? 'border-primary-400 bg-primary-500/[0.06]'  :
              disabled ? 'border-border bg-muted opacity-40 cursor-not-allowed' :
                         'border-border bg-surface hover:border-primary-400/50 hover:bg-primary-500/[0.03]'
            )}
          >
            <Avatar src={friend.photoURL} name={friend.displayName} size="sm" />
            <div className="flex-1 min-w-0">
              <p className={cn('font-semibold text-[15px] truncate leading-tight', sel ? 'text-primary-700 dark:text-primary-300' : 'text-foreground')}>
                {friend.displayName}
              </p>
              <p className="text-xs text-muted-foreground">@{friend.username}</p>
            </div>
            <div className={cn(
              'h-5 w-5 rounded-full border-2 transition-colors shrink-0 flex items-center justify-center',
              sel ? 'border-primary-500 bg-primary-500' : 'border-border bg-transparent'
            )}>
              {sel && (
                <svg viewBox="0 0 20 20" fill="white" className="h-3 w-3">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
