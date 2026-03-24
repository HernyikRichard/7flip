'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useGameDetail } from '@/hooks/useGameDetail'
import { useCamera } from '@/hooks/useCamera'
import { uploadScanImage, saveScanResult } from '@/services/scan.service'
import { drawMultipleCardsForPlayer } from '@/services/round.service'
import TopBar from '@/components/layout/TopBar'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'
import { CLASSIC_NUMBERS, REVENGE_NUMBERS } from '@/components/games/round/CardPickerModal'

// ── Kártyaszám picker (egyszerűsített inline verzió scan-hez) ─────────────────

const MINUS_VALUES = [2, 4, 6, 8, 10]

interface ScanCardPickerProps {
  gameMode: string
  onConfirm: (numbers: number[]) => void
}

function ScanCardPicker({ gameMode, onConfirm }: ScanCardPickerProps) {
  const NUMBERS = gameMode === 'revenge' || gameMode === 'brutal' ? REVENGE_NUMBERS : CLASSIC_NUMBERS
  const [selected, setSelected] = useState<number[]>([])

  function toggle(n: number) {
    setSelected((prev) => {
      const idx = prev.indexOf(n)
      if (idx !== -1) return prev.filter((_, i) => i !== idx)
      if (prev.length >= 7) return prev
      return [...prev, n]
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground text-center">
        Jelöld ki a képen látható számkártyákat
      </p>
      <div className="grid grid-cols-6 gap-2">
        {NUMBERS.map((n) => {
          const selIdx = selected.indexOf(n)
          const isSelected = selIdx !== -1
          return (
            <button
              key={n}
              onClick={() => toggle(n)}
              className={`
                relative flex items-center justify-center
                rounded-xl border-2 aspect-[3/4] text-lg font-bold
                shadow-sm active:scale-90 transition-transform
                ${isSelected
                  ? 'border-primary-500 bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 ring-2 ring-primary-400'
                  : 'border-border bg-surface text-foreground'
                }
              `}
            >
              {n}
              {isSelected && (
                <span className="absolute -top-1.5 -right-1.5 text-xs leading-none bg-primary-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {selIdx + 1}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-3">
        <p className="flex-1 text-xs text-muted-foreground">
          {selected.length === 0
            ? 'Nincs kijelölve'
            : `Kijelölve: ${selected.join(', ')} (össz: ${selected.reduce((s, n) => s + n, 0)})`
          }
        </p>
        <Button
          disabled={selected.length === 0}
          onClick={() => onConfirm(selected)}
        >
          Rögzítés
        </Button>
      </div>
    </div>
  )
}

// ── Fő scan oldal ─────────────────────────────────────────────────────────────

export default function ScanPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const router = useRouter()
  const { game, currentRound } = useGameDetail(id)
  const camera = useCamera()

  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Kamera leállítása navigáláskor
  useEffect(() => {
    return () => camera.stop()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCapture() {
    camera.capture()
  }

  async function handleUpload() {
    if (!camera.capturedBlob || !currentRound || !user) return
    setUploading(true)
    try {
      const url = await uploadScanImage(id, currentRound.id, user.uid, camera.capturedBlob)
      setUploadedUrl(url)
      // Scan result mentése (MVP: nincs ML, manuális kártya rögzítés)
      await saveScanResult({
        gameId: id,
        roundId: currentRound.id,
        userId: user.uid,
        imageUrl: url,
        rawDetections: {},
        detectedCards: [],
        confidence: 0,
        status: 'pending',
      })
    } finally {
      setUploading(false)
    }
  }

  async function handleCardsConfirmed(numbers: number[]) {
    if (!currentRound || !user) return
    setBusy(true)
    try {
      const gameMode = game?.gameMode ?? 'classic'
      await drawMultipleCardsForPlayer(
        id, currentRound.id, user.uid, numbers, currentRound.playerStates, gameMode
      )
      router.push(`/games/${id}`)
    } finally {
      setBusy(false)
    }
  }

  if (!user) return null

  const gameMode = game?.gameMode ?? 'classic'

  return (
    <>
      <TopBar title="Kamera scan" showBack backHref={`/games/${id}`} />
      <div className="flex flex-col h-[calc(100dvh-56px)] overflow-hidden">

        {/* ── Kamera kép (preview vagy captured) ── */}
        <div className="relative flex-1 bg-black overflow-hidden">

          {/* Live preview */}
          {camera.phase !== 'captured' && (
            <video
              ref={camera.videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}

          {/* Captured image */}
          {camera.phase === 'captured' && camera.capturedUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={camera.capturedUrl}
              alt="Scannelt kép"
              className="w-full h-full object-contain"
            />
          )}

          {/* Requesting / Error overlay */}
          {camera.phase === 'requesting' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Spinner size="lg" className="text-white" />
            </div>
          )}
          {camera.phase === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-2xl">📷</p>
              <p className="text-white font-semibold">Kamera nem elérhető</p>
              <p className="text-white/70 text-sm">{camera.errorMessage}</p>
            </div>
          )}

          {/* Capture gomb (preview fázisban) */}
          {camera.phase === 'preview' && (
            <div className="absolute bottom-6 inset-x-0 flex justify-center">
              <button
                onClick={handleCapture}
                className="w-16 h-16 rounded-full bg-white border-4 border-white/50 shadow-lg active:scale-90 transition-transform"
                aria-label="Fénykép készítése"
              />
            </div>
          )}

          {/* Feltöltés folyamatban */}
          {uploading && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
              <Spinner size="lg" className="text-white" />
              <p className="text-white text-sm">Feltöltés…</p>
            </div>
          )}
        </div>

        {/* ── Alsó panel ── */}
        <div
          className="bg-surface border-t border-border px-4 py-4 flex flex-col gap-4"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        >

          {/* Captured: feltöltés vagy újra */}
          {camera.phase === 'captured' && !uploadedUrl && (
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={camera.retake}>
                Újra
              </Button>
              <Button fullWidth onClick={handleUpload} loading={uploading}>
                Feltöltés
              </Button>
            </div>
          )}

          {/* Kártyák rögzítése (kép mentve) */}
          {uploadedUrl && (
            <ScanCardPicker
              gameMode={gameMode}
              onConfirm={handleCardsConfirmed}
            />
          )}

          {/* Manuális rögzítés közvetlen (feltöltés nélkül is) */}
          {camera.phase === 'captured' && !uploadedUrl && (
            <button
              onClick={() => setUploadedUrl('manual')}
              className="text-xs text-muted-foreground text-center underline underline-offset-2"
            >
              Kihagyom a feltöltést — kártyákat manuálisan rögzítem
            </button>
          )}

          {/* Ha kamera nem elérhető: manuális rögzítés */}
          {camera.phase === 'error' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground text-center">
                Kézzel is rögzítheted a kártyákat:
              </p>
              <ScanCardPicker
                gameMode={gameMode}
                onConfirm={handleCardsConfirmed}
              />
            </div>
          )}

          {busy && (
            <div className="flex items-center justify-center gap-2">
              <Spinner size="sm" />
              <p className="text-sm text-muted-foreground">Rögzítés…</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
