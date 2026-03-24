// Auth oldalak közös layout — mobil-first kártya elrendezés
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="mb-8 text-center">
        <span className="text-4xl font-black tracking-tight text-primary-600">7flip</span>
      </div>

      {/* Form kártya */}
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-lg">
        {children}
      </div>
    </main>
  )
}
