'use client'

import { useRef, useState, useCallback, useEffect } from 'react'

type CameraPhase = 'requesting' | 'preview' | 'captured' | 'error'

interface UseCameraReturn {
  phase: CameraPhase
  errorMessage: string | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  capturedBlob: Blob | null
  capturedUrl: string | null
  capture: () => void
  retake: () => void
  stop: () => void
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [phase, setPhase] = useState<CameraPhase>('requesting')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null)

  const startCamera = useCallback(async () => {
    setPhase('requesting')
    setErrorMessage(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setPhase('preview')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kamera hozzáférés megtagadva'
      setErrorMessage(msg)
      setPhase('error')
    }
  }, [])

  useEffect(() => {
    startCamera()
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [startCamera])

  const capture = useCallback(() => {
    const video = videoRef.current
    if (!video || phase !== 'preview') return

    const canvas = document.createElement('canvas')
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)

    canvas.toBlob((blob) => {
      if (!blob) return
      // Stop camera after capture
      streamRef.current?.getTracks().forEach((t) => t.stop())
      setCapturedBlob(blob)
      setCapturedUrl(URL.createObjectURL(blob))
      setPhase('captured')
    }, 'image/jpeg', 0.85)
  }, [phase])

  const retake = useCallback(() => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl)
    setCapturedBlob(null)
    setCapturedUrl(null)
    startCamera()
  }, [capturedUrl, startCamera])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    if (capturedUrl) URL.revokeObjectURL(capturedUrl)
  }, [capturedUrl])

  return { phase, errorMessage, videoRef, capturedBlob, capturedUrl, capture, retake, stop }
}
