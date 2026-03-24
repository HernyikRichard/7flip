'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import BottomNav from '@/components/layout/BottomNav'
import InstallPrompt from '@/components/layout/InstallPrompt'
import InviteModal from '@/components/games/InviteModal'
import NotificationListener from '@/components/layout/NotificationListener'
import Spinner from '@/components/ui/Spinner'
import { ROUTES } from '@/lib/constants'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Ha betöltött és nincs user → login oldalra
    if (!loading && !user) {
      router.replace(ROUTES.LOGIN)
    }
  }, [user, loading, router])

  // Kezdeti auth betöltés közben teljes képernyős spinner
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">Betöltés...</p>
        </div>
      </div>
    )
  }

  // Nincs user → ne villanjon fel a védett tartalom, useEffect kezeli a redirectet
  if (!user) return null

  return (
    <div className="flex min-h-screen flex-col">
      {/* Tartalom — BottomNav magassága miatt padding lent */}
      <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))]">
        {children}
      </main>

      <InstallPrompt />
      <InviteModal />
      <NotificationListener />
      <BottomNav />
    </div>
  )
}
