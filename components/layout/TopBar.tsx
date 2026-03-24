'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TopBarProps {
  title: string
  showBack?: boolean
  backHref?: string
  right?: React.ReactNode   // opcionális jobb oldali akciógomb
  className?: string
}

export default function TopBar({
  title,
  showBack = false,
  backHref,
  right,
  className,
}: TopBarProps) {
  const router = useRouter()

  function handleBack() {
    if (backHref) {
      router.push(backHref)
    } else {
      router.back()
    }
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-14 items-center border-b border-border bg-surface px-4',
        // safe-area: notch figyelembe vétele
        'pt-[env(safe-area-inset-top)]',
        className
      )}
      style={{ height: 'calc(3.5rem + env(safe-area-inset-top))' }}
    >
      {/* Bal oldal */}
      <div className="w-10">
        {showBack && (
          <button
            onClick={handleBack}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl',
              'text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              'active:scale-95'
            )}
            aria-label="Vissza"
          >
            <ArrowLeft size={20} />
          </button>
        )}
      </div>

      {/* Cím — középre igazítva */}
      <h1 className="flex-1 text-center text-base font-semibold text-foreground">
        {title}
      </h1>

      {/* Jobb oldal */}
      <div className="flex w-10 justify-end">
        {right ?? null}
      </div>
    </header>
  )
}
