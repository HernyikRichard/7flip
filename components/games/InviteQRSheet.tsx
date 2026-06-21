'use client'

import { useState, useEffect } from 'react'
import QRCode from 'react-qr-code'
import { enableGameInvite } from '@/services/game.service'

interface InviteQRSheetProps {
  gameId: string
  isHost: boolean
  onClose: () => void
}

export default function InviteQRSheet({ gameId, isHost, onClose }: InviteQRSheetProps) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const canShare = typeof navigator !== 'undefined' && !!navigator.share

  useEffect(() => {
    if (!isHost) return
    enableGameInvite(gameId)
      .then((code) => {
        const base = typeof window !== 'undefined' ? window.location.origin : ''
        setInviteUrl(`${base}/join/${code}`)
        setLoading(false)
      })
      .catch(() => {
        setError('Nem sikerült generálni a meghívót.')
        setLoading(false)
      })
  }, [gameId, isHost])

  async function handleCopy() {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Másolás nem sikerült.')
    }
  }

  async function handleShare() {
    if (!inviteUrl || !canShare) return
    try {
      await navigator.share({ title: '7flip meghívó', url: inviteUrl })
    } catch {
      // user cancelled or not supported
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-t-3xl border-t border-border flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4 shrink-0">
          <div>
            <p className="font-bold text-foreground text-[15px]">QR meghívó</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Mutasd a QR-kódot, vagy küldd el a linket
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-muted px-3.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Bezár
          </button>
        </div>

        {/* Content */}
        <div
          className="px-5 flex flex-col items-center gap-5"
          style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {loading && (
            <div className="w-48 h-48 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          {!loading && inviteUrl && (
            <>
              {/* QR kód */}
              <div className="rounded-2xl border-2 border-border bg-white p-4 shadow-sm">
                <QRCode
                  value={inviteUrl}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#1a1a2e"
                />
              </div>

              {/* Link */}
              <div className="w-full rounded-2xl border border-border bg-muted px-4 py-3 flex items-center gap-2 min-w-0">
                <p className="flex-1 text-xs text-muted-foreground font-mono truncate">{inviteUrl}</p>
              </div>

              {/* Gombok */}
              <div className="w-full flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 h-12 rounded-2xl border-2 border-primary-400 bg-primary-500/10 text-sm font-semibold text-primary-600 dark:text-primary-400 active:scale-[0.97] transition-all"
                >
                  {copied ? '✓ Másolva!' : '📋 Link másolása'}
                </button>
                {canShare && (
                  <button
                    onClick={handleShare}
                    className="flex-1 h-12 rounded-2xl border-2 border-emerald-400 bg-emerald-500/10 text-sm font-semibold text-emerald-700 dark:text-emerald-400 active:scale-[0.97] transition-all"
                  >
                    ↗ Megosztás
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
