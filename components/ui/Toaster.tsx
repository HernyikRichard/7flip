'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { ToastContext, type Toast, type ToastType } from '@/hooks/useToast'
import { cn } from '@/lib/utils'

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
}

const STYLES = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200',
  error:   'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200',
  info:    'bg-primary-50 border-primary-200 text-primary-800 dark:bg-primary-950 dark:border-primary-800 dark:text-primary-200',
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const Icon = ICONS[toast.type]

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3500)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg',
        'animate-in slide-in-from-bottom-4 duration-200',
        'max-w-sm w-full',
        STYLES[toast.type]
      )}
    >
      <Icon size={18} className="shrink-0 mt-0.5" />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Bezárás"
      >
        <X size={16} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counterRef = useRef(0)

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${++counterRef.current}`
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]) // max 4 egyszerre
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      {/* Toast konténer — képernyő alján, BottomNav felett */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none"
        style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto w-full max-w-sm">
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
