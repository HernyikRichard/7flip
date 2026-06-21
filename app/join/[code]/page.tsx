'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getGameByInviteCode, joinGameByInvite } from '@/services/game.service'
import { ROUTES } from '@/lib/constants'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import type { Game } from '@/types'

type PageState = 'loading' | 'auth' | 'ready' | 'joining' | 'error' | 'already_member' | 'not_lobby'

export default function JoinPage() {
  const { code } = useParams<{ code: string }>()
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()

  const [game, setGame] = useState<Game | null>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Auth redirect — ha nem bejelentkezett, login oldalra küldjük redirect parammal
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace(`${ROUTES.LOGIN}?redirect=/join/${code}`)
    }
  }, [user, authLoading, router, code])

  const loadGame = useCallback(async () => {
    if (!code || !user) return
    try {
      const g = await getGameByInviteCode(code)
      if (!g) {
        setErrorMsg('Érvénytelen vagy lejárt meghívó.')
        setPageState('error')
        return
      }
      if (g.playerUids.includes(user.uid)) {
        setGame(g)
        setPageState('already_member')
        return
      }
      if (g.status !== 'waiting_for_players') {
        setGame(g)
        setPageState('not_lobby')
        return
      }
      setGame(g)
      setPageState('ready')
    } catch {
      setErrorMsg('Nem sikerült betölteni a játékot.')
      setPageState('error')
    }
  }, [code, user])

  useEffect(() => {
    if (!user || pageState !== 'loading') return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadGame()
  }, [user, pageState, loadGame])

  // Auto-redirect ha már tag
  useEffect(() => {
    if (pageState === 'already_member' && game) {
      router.replace(`/games/${game.id}`)
    }
  }, [pageState, game, router])

  async function handleJoin() {
    if (!user || !game) return
    setPageState('joining')
    try {
      await joinGameByInvite(game.id, {
        uid: user.uid,
        displayName: profile?.displayName ?? user.displayName ?? 'Játékos',
        photoURL: profile?.photoURL ?? user.photoURL ?? null,
      })
      router.replace(`/games/${game.id}`)
    } catch {
      setErrorMsg('Nem sikerült csatlakozni. Próbáld újra.')
      setPageState('error')
    }
  }

  if (authLoading || pageState === 'loading' || pageState === 'auth' || pageState === 'already_member') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const creator = game?.players.find((p) => p.uid === game.createdBy)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col gap-5">

        {/* Logo / branding */}
        <div className="text-center mb-2">
          <p className="text-3xl font-black text-foreground tracking-tight">7flip</p>
        </div>

        {/* Error state */}
        {(pageState === 'error') && (
          <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-5 py-5 flex flex-col gap-3 text-center">
            <p className="text-2xl">🔗</p>
            <p className="font-bold text-foreground">Érvénytelen meghívó</p>
            <p className="text-sm text-muted-foreground">{errorMsg ?? 'Ez a meghívó már nem érvényes.'}</p>
            <button
              onClick={() => router.replace(ROUTES.DASHBOARD)}
              className="mt-1 text-sm font-semibold text-primary-600 dark:text-primary-400"
            >
              Főoldalra
            </button>
          </div>
        )}

        {/* Game started state */}
        {pageState === 'not_lobby' && game && (
          <div className="rounded-2xl border border-border bg-surface px-5 py-5 flex flex-col gap-3 text-center">
            <p className="text-2xl">🎮</p>
            <p className="font-bold text-foreground">A játék már elkezdődött</p>
            <p className="text-sm text-muted-foreground">
              {creator?.displayName ?? 'Valaki'} játéka már fut — ezt a meghívót nem lehet felhasználni.
            </p>
            <button
              onClick={() => router.replace(ROUTES.DASHBOARD)}
              className="mt-1 text-sm font-semibold text-primary-600 dark:text-primary-400"
            >
              Főoldalra
            </button>
          </div>
        )}

        {/* Ready to join */}
        {pageState === 'ready' && game && (
          <div className="rounded-2xl border border-border bg-surface px-5 py-5 flex flex-col gap-4">
            <div className="text-center">
              <p className="text-3xl mb-2">🎮</p>
              <p className="font-bold text-lg text-foreground">Játékmeghívó</p>
              {creator && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  <span className="font-semibold text-foreground">{creator.displayName}</span> meghívott
                </p>
              )}
            </div>

            {/* Játékosok */}
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Játékosok ({game.players.length})
              </p>
              {game.players.map((p) => (
                <div key={p.uid} className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2">
                  {p.isGuest
                    ? <span className="w-8 h-8 flex items-center justify-center rounded-full bg-surface text-base shrink-0">👤</span>
                    : <Avatar src={p.photoURL} name={p.displayName} size="sm" />
                  }
                  <span className="flex-1 text-sm font-medium text-foreground">{p.displayName}</span>
                  {p.isGuest && (
                    <span className="text-[10px] font-semibold text-muted-foreground">Vendég</span>
                  )}
                </div>
              ))}
            </div>

            <Button fullWidth size="lg" onClick={handleJoin}>
              Csatlakozás
            </Button>
          </div>
        )}

        {/* Joining spinner */}
        {pageState === 'joining' && (
          <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <p className="text-sm text-muted-foreground">Csatlakozás...</p>
          </div>
        )}
      </div>
    </div>
  )
}
