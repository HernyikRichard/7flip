'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useGames } from '@/hooks/useGames'
import { useAuth } from '@/hooks/useAuth'
import { respondToInvite } from '@/services/game.service'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import type { Game } from '@/types'

export default function InviteModal() {
  const { user } = useAuth()
  const { games } = useGames()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!user || !mounted) return null

  const invite: Game | undefined = games.find((g) => {
    if (g.status !== 'waiting_for_players') return false
    return g.players.find((p) => p.uid === user.uid)?.inviteStatus === 'pending'
  })

  if (!invite) return null

  const creator = invite.players.find((p) => p.uid === invite.createdBy)

  async function handle(response: 'accepted' | 'declined') {
    setBusy(true)
    try {
      await respondToInvite(invite!.id, user!.uid, response)
      if (response === 'accepted') {
        router.push(`/games/${invite!.id}`)
      }
    } finally { setBusy(false) }
  }

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 1.5rem',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <div className="bg-surface rounded-3xl border border-border w-full max-w-sm flex flex-col gap-5 p-6 shadow-xl">

        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-3xl">🎮</p>
          <p className="font-bold text-foreground text-lg">Játékmeghívó</p>
          {creator && (
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{creator.displayName}</span> meghívott egy játékba
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Játékosok</p>
          {invite.players.map((p) => (
            <div key={p.uid} className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2">
              <Avatar src={p.photoURL} name={p.displayName} size="sm" />
              <span className="flex-1 text-sm font-medium text-foreground">{p.displayName}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                p.inviteStatus === 'accepted'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : p.uid === user.uid
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                  : 'bg-muted-foreground/10 text-muted-foreground'
              }`}>
                {p.inviteStatus === 'accepted' ? '✓ Elfogadta' : p.uid === user.uid ? 'Te' : 'Várakozik'}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Button fullWidth size="lg" onClick={() => handle('accepted')} loading={busy}>Elfogadom</Button>
          <Button fullWidth variant="secondary" onClick={() => handle('declined')} loading={busy}>Elutasítom</Button>
        </div>

      </div>
    </div>,
    document.body
  )
}
