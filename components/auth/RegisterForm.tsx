'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { registerWithEmail } from '@/services/auth.service'
import { getAuthErrorMessage } from '@/lib/firebase/errors'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/lib/constants'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import ErrorMessage from '@/components/ui/ErrorMessage'
import GoogleLoginButton from './GoogleLoginButton'

function validateForm(displayName: string, email: string, password: string, confirm: string) {
  if (displayName.trim().length < 2) return 'A nevednek legalább 2 karakter hosszúnak kell lennie.'
  if (!email.includes('@')) return 'Érvénytelen email cím.'
  if (password.length < 6) return 'A jelszó legalább 6 karakter hosszú legyen.'
  if (password !== confirm) return 'A két jelszó nem egyezik.'
  return null
}

export default function RegisterForm() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(ROUTES.DASHBOARD)
    }
  }, [user, authLoading, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const validationError = validateForm(displayName, email, password, confirm)
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    try {
      await registerWithEmail(email, password, displayName.trim())
      router.push(ROUTES.DASHBOARD)
    } catch (err) {
      setError(getAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Fiók létrehozása</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Csatlakozz a 7flip közösséghez
        </p>
      </div>

      <GoogleLoginButton onError={setError} />

      <div className="relative flex items-center gap-3">
        <div className="flex-1 border-t border-border" />
        <span className="text-xs text-muted-foreground">vagy</span>
        <div className="flex-1 border-t border-border" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Megjelenített név"
          type="text"
          placeholder="Pl. Kiss Péter"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="name"
          required
        />
        <Input
          label="Email"
          type="email"
          placeholder="pelda@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <Input
          label="Jelszó"
          type="password"
          placeholder="Legalább 6 karakter"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <Input
          label="Jelszó megerősítése"
          type="password"
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
        />

        <ErrorMessage message={error} />

        <Button type="submit" fullWidth loading={loading}>
          Fiók létrehozása
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Már van fiókod?{' '}
        <Link
          href={ROUTES.LOGIN}
          className="font-medium text-primary-600 hover:underline"
        >
          Jelentkezz be
        </Link>
      </p>
    </div>
  )
}
