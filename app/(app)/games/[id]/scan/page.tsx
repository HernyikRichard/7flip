'use client'

import { useParams } from 'next/navigation'
import TopBar from '@/components/layout/TopBar'

export default function ScanPage() {
  const { id } = useParams<{ id: string }>()
  return (
    <>
      <TopBar title="Kamera scan" showBack backHref={`/games/${id}`} />
      <div className="px-4 py-6 text-center">
        <p className="text-muted-foreground">Kamera — Fázis 7-ben készül el.</p>
      </div>
    </>
  )
}
