import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import type { UserProfile } from '@/types'

interface ProfileCardProps {
  profile: UserProfile
  showStats?: boolean
}

export default function ProfileCard({ profile, showStats = true }: ProfileCardProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <Avatar
        src={profile.photoURL}
        name={profile.displayName}
        size="xl"
      />

      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">{profile.displayName}</h2>
        <p className="text-sm text-muted-foreground">@{profile.username}</p>
      </div>

      {showStats && (
        <div className="flex gap-4 mt-1">
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-foreground">{profile.gamesPlayed}</span>
            <span className="text-xs text-muted-foreground">Játék</span>
          </div>
          <div className="w-px bg-border" />
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-foreground">{profile.gamesWon}</span>
            <span className="text-xs text-muted-foreground">Győzelem</span>
          </div>
          <div className="w-px bg-border" />
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-foreground">
              {profile.gamesPlayed > 0
                ? Math.round((profile.gamesWon / profile.gamesPlayed) * 100)
                : 0}%
            </span>
            <span className="text-xs text-muted-foreground">Arány</span>
          </div>
        </div>
      )}
    </div>
  )
}
