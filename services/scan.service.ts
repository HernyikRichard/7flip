import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import db from '@/lib/firebase/firestore'
import storage from '@/lib/firebase/storage'
import { COLLECTIONS } from '@/lib/constants'
import type { CreateScanResultData } from '@/types/scan.types'

// ── Scan kép feltöltése Firebase Storage-ba ───────────────────────────────────

export async function uploadScanImage(
  gameId: string,
  roundId: string,
  userId: string,
  blob: Blob
): Promise<string> {
  const timestamp = Date.now()
  const path = `scans/${gameId}/${roundId}/${userId}_${timestamp}.jpg`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' })
  return getDownloadURL(storageRef)
}

// ── Scan eredmény mentése Firestore-ba ────────────────────────────────────────

export async function saveScanResult(data: CreateScanResultData): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.SCAN_RESULTS ?? 'scanResults'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}
