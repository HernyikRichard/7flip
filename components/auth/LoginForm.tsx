'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { loginWithEmail } from '@/services/auth.service'
import { getAuthErrorMessage } from '@/lib/firebase/errors'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/lib/constants'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import ErrorMessage from '@/components/ui/ErrorMessage'
import GoogleLoginButton from './GoogleLoginButton'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()

  // Csak relatív path-t engedünk redirect-ként (XSS védelem)
  const rawRedirect = searchParams.get('redirect') ?? ''
  const redirectTo = rawRedirect.startsWith('/') ? rawRedirect : ROUTES.DASHBOARD

  // Google redirect visszatérés után: ha user bejelentkezett, átirányítjuk
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(redirectTo)
    }
  }, [user, authLoading, router, redirectTo])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await loginWithEmail(email, password)
      router.push(redirectTo)
    } catch (err) {
      setError(getAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Üdv vissza!</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Jelentkezz be a folytatáshoz
        </p>
      </div>

      <GoogleLoginButton onError={setError} redirectTo={redirectTo} />

      <div className="relative flex items-center gap-3">
        <div className="flex-1 border-t border-border" />
        <span className="text-xs text-muted-foreground">vagy</span>
        <div className="flex-1 border-t border-border" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <ErrorMessage message={error} />

        <Button type="submit" fullWidth loading={loading}>
          Bejelentkezés
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Még nincs fiókod?{' '}
        <Link
          href={ROUTES.REGISTER}
          className="font-medium text-primary-600 hover:underline"
        >
          Regisztrálj
        </Link>
      </p>
    </div>
  )
}
