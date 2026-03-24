const CACHE_NAME = '7flip-v1'

// App shell fájlok — ezek mindig cache-elve lesznek
const APP_SHELL = [
  '/',
  '/dashboard',
  '/offline',
  '/manifest.json',
]

// Install: app shell cache-elése
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  )
  self.skipWaiting()
})

// Activate: régi cache törlése
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: cache stratégia
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Firebase / API hívások: network-only (ne cache-eljük)
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('firestore') ||
    request.method !== 'GET'
  ) {
    return
  }

  // Next.js statikus assetok (_next/static): cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetch(request).then((res) => {
        const clone = res.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        return res
      }))
    )
    return
  }

  // Navigáció (HTML oldalak): network-first, offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/offline').then((cached) => cached ?? Response.error())
      )
    )
    return
  }
})
