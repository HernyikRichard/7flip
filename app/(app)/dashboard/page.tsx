'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useFriends } from '@/hooks/useFriends'
import TopBar from '@/components/layout/TopBar'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import { ROUTES } from '@/lib/constants'

export default function DashboardPage() {
  const { profile } = useAuth()
  const { incoming, friendships } = useFriends()
  const router = useRouter()

  return (
    <>
      <TopBar title="7flip" />

      <div className="px-4 py-6 flex flex-col gap-6 max-w-lg mx-auto">

        {/* Üdvözlés */}
        {profile && (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
            <Avatar src={profile.photoURL} name={profile.displayName} size="md" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">
                {profile.displayName}
              </p>
              <p className="text-xs text-muted-foreground">@{profile.username}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-foreground">{profile.gamesPlayed}</p>
              <p className="text-xs text-muted-foreground">játék</p>
            </div>
          </div>
        )}

        {/* Gyors akciók */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Gyors indítás
          </h2>
          <Button fullWidth onClick={() => router.push(ROUTES.GAMES_NEW)}>
            + Új játék indítása
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" fullWidth onClick={() => router.push(ROUTES.GAMES)}>
              Aktív játékok
            </Button>
            <Button variant="secondary" fullWidth onClick={() => router.push(ROUTES.HISTORY)}>
              Előzmények
            </Button>
          </div>
        </div>

        {/* Barátok gyors elérés */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Közösség
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" fullWidth onClick={() => router.push(ROUTES.FRIENDS)}>
              Barátok ({friendships.length})
            </Button>
            <Button
              variant={incoming.length > 0 ? 'primary' : 'secondary'}
              fullWidth
              onClick={() => router.push(ROUTES.FRIEND_REQUESTS)}
            >
              {incoming.length > 0 ? `${incoming.length} kérés` : 'Kérések'}
            </Button>
          </div>
        </div>

      </div>
    </>
  )
}
