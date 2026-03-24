import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2',
          'font-semibold rounded-xl select-none',
          'transition-all duration-150 active:scale-[0.96]',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          'focus-visible:ring-offset-background',
          'disabled:opacity-40 disabled:pointer-events-none',
          'min-h-[44px]',
          size === 'sm' && 'text-sm px-3.5 py-2 min-h-[36px] rounded-lg',
          size === 'md' && 'text-sm px-5 py-2.5',
          size === 'lg' && 'text-[15px] px-6 py-3.5 rounded-2xl',
          variant === 'primary' && 'bg-primary-600 text-white hover:bg-primary-500 shadow-sm',
          variant === 'secondary' && 'bg-surface border border-border text-foreground hover:bg-surface-elevated hover:border-primary-300/60 shadow-sm',
          variant === 'ghost' && 'text-muted-foreground hover:bg-muted hover:text-foreground',
          variant === 'danger' && 'bg-red-600 text-white hover:bg-red-500 shadow-sm',
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Betöltés…</span>
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
