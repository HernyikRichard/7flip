'use client'

import { useState } from 'react'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import { formatRelativeTime, toDate } from '@/lib/utils'
import type { FriendRequest } from '@/types'

interface FriendRequestListProps {
  requests: FriendRequest[]
  type: 'incoming' | 'outgoing'
  onAccept?: (id: string) => Promise<void>
  onReject?: (id: string) => Promise<void>
  onCancel?: (id: string) => Promise<void>
}

export default function FriendRequestList({
  requests,
  type,
  onAccept,
  onReject,
  onCancel,
}: FriendRequestListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function handle(id: string, action: (id: string) => Promise<void>) {
    setLoadingId(id)
    try {
      await action(id)
    } finally {
      setLoadingId(null)
    }
  }

  if (requests.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {requests.map((req) => (
        <div
          key={req.id}
          className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4"
        >
          <Avatar
            src={req.fromPhotoURL}
            name={req.fromDisplayName}
            size="md"
          />

          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              {req.fromDisplayName}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatRelativeTime(toDate(req.createdAt) ?? new Date())}
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            {type === 'incoming' && onAccept && onReject && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  loading={loadingId === req.id}
                  onClick={() => handle(req.id, onReject)}
                >
                  Elutasít
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  loading={loadingId === req.id}
                  onClick={() => handle(req.id, onAccept)}
                >
                  Elfogad
                </Button>
              </>
            )}
            {type === 'outgoing' && onCancel && (
              <Button
                size="sm"
                variant="ghost"
                loading={loadingId === req.id}
                onClick={() => handle(req.id, onCancel)}
              >
                Visszavon
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
