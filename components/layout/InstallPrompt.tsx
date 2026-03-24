'use client'

import { useEffect, useState } from 'react'
import { X, Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Már telepítve van?
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // Már elutasítva?
    if (localStorage.getItem('pwa-install-dismissed')) return

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!installEvent) return
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    if (outcome === 'accepted') {
      setInstallEvent(null)
    }
  }

  function handleDismiss() {
    setDismissed(true)
    setInstallEvent(null)
    localStorage.setItem('pwa-install-dismissed', '1')
  }

  if (!installEvent || dismissed) return null

  return (
    <div className="fixed bottom-[5rem] left-4 right-4 z-50 mx-auto max-w-sm">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xl">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white font-black text-lg">
          7
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">Telepítsd a 7flip-et!</p>
          <p className="text-xs text-muted-foreground">Gyors elérés a főképernyőről</p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 flex items-center gap-1.5 rounded-xl bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Download size={14} />
          Telepítés
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Bezárás"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
