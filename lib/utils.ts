import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Tailwind osztályok biztonságos összefűzése
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Username validáció: csak kisbetű, szám, underscore, 3-20 karakter
export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_]{3,20}$/.test(username)
}

// Relatív időformázás magyarul
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'most'
  if (diffMins < 60) return `${diffMins} perce`
  if (diffHours < 24) return `${diffHours} órája`
  if (diffDays < 7) return `${diffDays} napja`
  return date.toLocaleDateString('hu-HU')
}

// Firestore Timestamp → Date konverzió null-safe
export function toDate(timestamp: { toDate: () => Date } | null | undefined): Date | null {
  if (!timestamp) return null
  return timestamp.toDate()
}
