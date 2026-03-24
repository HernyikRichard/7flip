'use client'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center gap-4">
      <p className="text-5xl">📡</p>
      <h1 className="text-2xl font-bold text-foreground">Nincs internetkapcsolat</h1>
      <p className="text-muted-foreground max-w-xs">
        Úgy tűnik, nincs hálózati kapcsolatod. Ellenőrizd az internetkapcsolatot, és próbáld újra.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 rounded-xl bg-primary-600 px-6 py-3 text-base font-medium text-white hover:bg-primary-700 active:scale-95 transition-all"
      >
        Újra próbálom
      </button>
    </div>
  )
}
