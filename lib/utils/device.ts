/**
 * Device / environment helpers for auth flow decisions.
 * All functions are safe to call server-side (return false if no window).
 */

/** True if running in PWA standalone mode (added to home screen) */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** True on iOS (Safari popup/storage restrictions) */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as Record<string, unknown>).MSStream
  )
}

/** True on Android */
export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false
  return /Android/i.test(navigator.userAgent)
}

/**
 * Returns true when redirect-based auth is preferred over popup.
 *
 * Reasons:
 * - iOS Safari: blocks popups aggressively, 3rd-party cookie issues in popup iframe
 * - Android browsers: popup often blocked by the system WebView
 * - PWA standalone: popups open in a separate browser tab, losing session context
 */
export function shouldUseRedirectAuth(): boolean {
  return isIOS() || isAndroid() || isStandalonePWA()
}
