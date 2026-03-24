import { cn } from '@/lib/utils'

interface ErrorMessageProps {
  message: string | null | undefined
  className?: string
}

export default function ErrorMessage({ message, className }: ErrorMessageProps) {
  if (!message) return null

  return (
    <div
      role="alert"
      className={cn(
        'rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700',
        'dark:border-red-800 dark:bg-red-950 dark:text-red-300',
        className
      )}
    >
      {message}
    </div>
  )
}
