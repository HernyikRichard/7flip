'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TopBarProps {
  title: string
  showBack?: boolean
  backHref?: string
  right?: React.ReactNode
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
    if (backHref) router.push(backHref)
    else router.back()
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex items-center',
        'bg-surface/80 backdrop-blur-md',
        'border-b border-border',
        'px-4',
        className
      )}
      style={{
        height: 'calc(3.5rem + env(safe-area-inset-top))',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div className="w-10 shrink-0">
        {showBack && (
          <button
            onClick={handleBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors active:scale-95"
            aria-label="Vissza"
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
        )}
      </div>

      <h1 className="flex-1 text-center text-[15px] font-semibold text-foreground tracking-tight">
        {title}
      </h1>

      <div className="w-10 shrink-0 flex justify-end">
        {right ?? null}
      </div>
    </header>
  )
}
