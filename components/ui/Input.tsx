import { cn } from '@/lib/utils'
import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-2xl border-2 px-4 py-3 text-base',
            'bg-surface-elevated text-foreground placeholder:text-muted-foreground',
            'transition-colors duration-150',
            'focus:outline-none focus:border-primary-400',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'min-h-[48px]',
            error
              ? 'border-red-400 focus:border-red-400'
              : 'border-border',
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        {hint && !error && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
