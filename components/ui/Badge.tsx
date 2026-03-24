import { cn } from '@/lib/utils'

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'classic'
  | 'revenge'
  | 'brutal'
  | 'flip7'
  | 'bust'
  | 'frozen'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  className?: string
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default:  'bg-muted text-muted-foreground',
  success:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  warning:  'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  danger:   'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  info:     'bg-primary-100 text-primary-700 dark:bg-primary-500/15 dark:text-primary-400',
  classic:  'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  revenge:  'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  brutal:   'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  flip7:    'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  bust:     'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  frozen:   'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
}

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs',
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
