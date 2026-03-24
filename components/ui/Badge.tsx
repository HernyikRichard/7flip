import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}

const VARIANT_MAP = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  danger:  'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  info:    'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300',
}

export default function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        VARIANT_MAP[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
