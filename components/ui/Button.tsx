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
          // Alap stílusok
          'inline-flex items-center justify-center font-medium rounded-xl',
          'transition-all duration-150 active:scale-[0.97]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none',
          // Min touch target méret mobilon
          'min-h-[44px]',
          // Méretek
          size === 'sm' && 'text-sm px-3 py-1.5 min-h-[36px]',
          size === 'md' && 'text-base px-5 py-2.5',
          size === 'lg' && 'text-lg px-6 py-3',
          // Variánsok
          variant === 'primary' &&
            'bg-primary-600 text-white hover:bg-primary-700 shadow-sm',
          variant === 'secondary' &&
            'bg-surface border border-border text-foreground hover:bg-muted shadow-sm',
          variant === 'ghost' &&
            'text-foreground hover:bg-muted',
          variant === 'danger' &&
            'bg-red-600 text-white hover:bg-red-700',
          // Full width
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Betöltés...
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
