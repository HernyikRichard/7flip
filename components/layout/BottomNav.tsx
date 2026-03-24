'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Gamepad2, Users, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'

const NAV_ITEMS = [
  { href: ROUTES.DASHBOARD, label: 'Főoldal', icon: Home },
  { href: ROUTES.GAMES, label: 'Játékok', icon: Gamepad2 },
  { href: ROUTES.FRIENDS, label: 'Barátok', icon: Users },
  { href: ROUTES.PROFILE, label: 'Profil', icon: User },
] as const

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface">
      {/* safe-area padding iOS home indicator-hoz */}
      <div
        className="flex items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 py-2',
                'min-h-[56px] transition-colors duration-150',
                'text-xs font-medium',
                isActive
                  ? 'text-primary-600'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 2}
                aria-hidden
              />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
