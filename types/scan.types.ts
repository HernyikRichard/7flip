import { Timestamp } from 'firebase/firestore'
import type { Card } from './card.types'

export type ScanStatus = 'pending' | 'confirmed' | 'rejected'

export interface ScanResult {
  id: string
  gameId: string
  roundId: string
  userId: string
  /** Firebase Storage URL a készített képhez */
  imageUrl: string
  /** Nyers ML detektálás eredménye (jövőbeli ML pipeline-hoz) */
  rawDetections: Record<string, unknown>
  /**
   * Felismert kártyák — Card[] típus, nem string[].
   * MVP-ben kézzel kitöltve, később ML tölti.
   */
  detectedCards: Card[]
  /** 0-1 közötti magabiztossági érték (MVP-ben 0 = manuális) */
  confidence: number
  status: ScanStatus
  createdAt: Timestamp
}

export type CreateScanResultData = Omit<ScanResult, 'id' | 'createdAt'>
