'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  subscribeUnreadNotifications,
  markNotificationRead,
  type AppNotification,
} from '@/services/notification.service'

export default function NotificationListener() {
  const { user } = useAuth()
  const seenIds = useRef<Set<string>>(new Set())
  const [ready, setReady] = useState(false)
  const [queue, setQueue] = useState<AppNotification[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!user) return
    const unsub = subscribeUnreadNotifications(user.uid, (notifs) => {
      if (!ready) {
        notifs.forEach((n) => seenIds.current.add(n.id))
        setReady(true)
        return
      }
      const fresh = notifs.filter((n) => !seenIds.current.has(n.id))
      if (fresh.length === 0) return
      fresh.forEach((n) => seenIds.current.add(n.id))
      setQueue((prev) => [...prev, ...fresh])
    })
    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  function dismiss(notif: AppNotification) {
    setQueue((prev) => prev.filter((n) => n.id !== notif.id))
    if (user) markNotificationRead(user.uid, notif.id).catch(() => {})
  }

  if (!mounted || queue.length === 0) return null

  const current = queue[0]

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 1.5rem',
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <div className="bg-surface rounded-3xl border border-border w-full max-w-sm flex flex-col gap-5 p-6 shadow-xl">

        {current.type === 'invite_declined' && (
          <>
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-3xl">😔</p>
              <p className="font-bold text-foreground text-lg">Meghívó elutasítva</p>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{current.actorName}</span>{' '}
                elutasította a játékmeghívót.
              </p>
            </div>
            {queue.length > 1 && (
              <p className="text-xs text-muted-foreground text-center">+{queue.length - 1} további értesítés</p>
            )}
            <button
              onClick={() => dismiss(current)}
              className="w-full rounded-2xl bg-muted hover:bg-border transition-colors py-3 text-sm font-semibold text-foreground"
            >
              Rendben
            </button>
          </>
        )}

      </div>
    </div>,
    document.body
  )
}
