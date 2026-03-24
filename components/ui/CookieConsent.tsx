'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export type CookieConsent = 'all' | 'essential' | null

const STORAGE_KEY = 'cookie_consent'

export function useCookieConsent() {
  const [consent, setConsentState] = useState<CookieConsent>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as CookieConsent | null
    setConsentState(stored)
    setLoaded(true)
  }, [])

  function setConsent(value: 'all' | 'essential') {
    localStorage.setItem(STORAGE_KEY, value)
    setConsentState(value)
  }

  return { consent, setConsent, loaded }
}

export default function CookieConsent() {
  const { consent, setConsent, loaded } = useCookieConsent()

  // Csak akkor jelenjen meg, ha már betöltöttük a localStorage-t és nincs döntés
  if (!loaded || consent !== null) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie beállítások"
      className={cn(
        'fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 z-50 mx-4 mb-2',
        'rounded-2xl border border-border bg-surface shadow-xl',
        'p-4 flex flex-col gap-3 max-w-lg mx-auto'
      )}
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-foreground">Süti beállítások</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Az alkalmazás alapvető sütiket használ a bejelentkezéshez és a munkamenet kezeléséhez.
          Az „Elfogadom az összeset" gombra kattintva hozzájárulsz az összes süti használatához
          az EU e-Privacy és GDPR szabályozásnak megfelelően.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setConsent('essential')}
          className={cn(
            'flex-1 rounded-xl border border-border px-3 py-2.5',
            'text-xs font-medium text-muted-foreground',
            'transition-colors hover:bg-muted active:scale-95'
          )}
        >
          Csak szükséges
        </button>
        <button
          onClick={() => setConsent('all')}
          className={cn(
            'flex-1 rounded-xl bg-primary-600 px-3 py-2.5',
            'text-xs font-semibold text-white',
            'transition-colors hover:bg-primary-700 active:scale-95'
          )}
        >
          Elfogadom az összeset
        </button>
      </div>
    </div>
  )
}
