import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface FriendCardProps {
  uid: string
  displayName: string
  username: string
  photoURL?: string | null
  // Akció gombok — opcionálisan megadható
  primaryAction?: { label: string; onClick: () => void; loading?: boolean; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }
  secondaryAction?: { label: string; onClick: () => void; loading?: boolean; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }
  className?: string
}

export default function FriendCard({
  displayName,
  username,
  photoURL,
  primaryAction,
  secondaryAction,
  className,
}: FriendCardProps) {
  return (
    <div className={cn(
      'flex items-center gap-3 rounded-2xl border border-border bg-surface p-4',
      className
    )}>
      <Avatar src={photoURL} name={displayName} size="md" />

      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{displayName}</p>
        <p className="text-sm text-muted-foreground truncate">@{username}</p>
      </div>

      {(primaryAction || secondaryAction) && (
        <div className="flex gap-2 shrink-0">
          {secondaryAction && (
            <Button
              size="sm"
              variant={secondaryAction.variant ?? 'ghost'}
              loading={secondaryAction.loading}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
          {primaryAction && (
            <Button
              size="sm"
              variant={primaryAction.variant ?? 'primary'}
              loading={primaryAction.loading}
              onClick={primaryAction.onClick}
            >
              {primaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
