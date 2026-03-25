// Auth oldalak közös layout — mobil-first kártya elrendezés
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12 bg-background">
      {/* Logo */}
      <div className="mb-8 text-center">
        <span className="text-5xl font-black tracking-tight text-primary-500">7flip</span>
        <p className="text-xs text-muted-foreground mt-1 tracking-widest uppercase font-medium">Kártyajáték</p>
      </div>

      {/* Form kártya */}
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-6 card-shadow-md">
        {children}
      </div>
    </main>
  )
}
