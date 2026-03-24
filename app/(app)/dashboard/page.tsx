'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useFriends } from '@/hooks/useFriends'
import TopBar from '@/components/layout/TopBar'
import Avatar from '@/components/ui/Avatar'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'

const MODE_CARDS = [
  {
    mode: 'classic',
    emoji: '🃏',
    label: 'Classic',
    desc: 'Cél: 100 pont',
    cls: 'border-blue-500/30 bg-blue-500/[0.06] dark:bg-blue-500/[0.08]',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  },
  {
    mode: 'revenge',
    emoji: '⚔️',
    label: 'Revenge',
    desc: 'Cél: 200 pont',
    cls: 'border-red-500/30 bg-red-500/[0.06] dark:bg-red-500/[0.08]',
    badge: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  },
  {
    mode: 'brutal',
    emoji: '💀',
    label: 'Brutal',
    desc: 'Negatív is lehet',
    cls: 'border-orange-500/30 bg-orange-500/[0.06] dark:bg-orange-500/[0.08]',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
  },
]

export default function DashboardPage() {
  const { profile } = useAuth()
  const { incoming, friendships } = useFriends()
  const router = useRouter()

  return (
    <>
      <TopBar title="7flip" />

      <div className="px-4 py-5 flex flex-col gap-5 max-w-lg mx-auto">

        {/* Profile card */}
        {profile && (
          <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-surface p-4 card-shadow">
            <Avatar src={profile.photoURL} name={profile.displayName} size="md" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-[15px] leading-tight truncate">
                {profile.displayName}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">@{profile.username}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xl font-bold tabular-nums text-foreground">{profile.gamesPlayed}</p>
              <p className="text-[11px] text-muted-foreground">játék</p>
            </div>
          </div>
        )}

        {/* New game CTA */}
        <button
          onClick={() => router.push(ROUTES.GAMES_NEW)}
          className="w-full rounded-2xl bg-primary-500 hover:bg-primary-600 active:scale-[0.98] transition-all py-4 text-base font-bold text-white shadow-lg shadow-primary-500/25 glow-primary"
        >
          + Új játék indítása
        </button>

        {/* Game modes */}
        <div className="flex flex-col gap-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-0.5">
            Játékmódok
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {MODE_CARDS.map(({ mode, emoji, label, desc, cls, badge }) => (
              <button
                key={mode}
                onClick={() => router.push(`${ROUTES.GAMES_NEW}?mode=${mode}`)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-2xl border-2 py-4 px-2 text-center',
                  'active:scale-[0.97] transition-transform',
                  cls
                )}
              >
                <span className="text-2xl">{emoji}</span>
                <div>
                  <p className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full', badge)}>{label}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Quick nav */}
        <div className="flex flex-col gap-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-0.5">
            Navigáció
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => router.push(ROUTES.GAMES)}
              className="flex flex-col gap-1.5 rounded-2xl border border-border bg-surface p-4 text-left card-shadow active:scale-[0.98] transition-transform"
            >
              <span className="text-xl">🎮</span>
              <p className="text-sm font-semibold text-foreground">Aktív játékok</p>
              <p className="text-xs text-muted-foreground">Folyamatban lévők</p>
            </button>
            <button
              onClick={() => router.push(ROUTES.HISTORY)}
              className="flex flex-col gap-1.5 rounded-2xl border border-border bg-surface p-4 text-left card-shadow active:scale-[0.98] transition-transform"
            >
              <span className="text-xl">📋</span>
              <p className="text-sm font-semibold text-foreground">Előzmények</p>
              <p className="text-xs text-muted-foreground">Befejezett játékok</p>
            </button>
            <button
              onClick={() => router.push(ROUTES.FRIENDS)}
              className="flex flex-col gap-1.5 rounded-2xl border border-border bg-surface p-4 text-left card-shadow active:scale-[0.98] transition-transform"
            >
              <span className="text-xl">👥</span>
              <p className="text-sm font-semibold text-foreground">Barátok</p>
              <p className="text-xs text-muted-foreground">{friendships.length} kapcsolat</p>
            </button>
            <button
              onClick={() => router.push(ROUTES.FRIEND_REQUESTS)}
              className={cn(
                'flex flex-col gap-1.5 rounded-2xl border p-4 text-left card-shadow active:scale-[0.98] transition-transform',
                incoming.length > 0
                  ? 'border-primary-400/50 bg-primary-500/[0.06]'
                  : 'border-border bg-surface'
              )}
            >
              <span className="text-xl">📨</span>
              <p className="text-sm font-semibold text-foreground">
                Kérések
                {incoming.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary-500 text-white text-[10px] font-bold">
                    {incoming.length}
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {incoming.length > 0 ? `${incoming.length} új kérés` : 'Nincs függő'}
              </p>
            </button>
          </div>
        </div>

      </div>
    </>
  )
}
