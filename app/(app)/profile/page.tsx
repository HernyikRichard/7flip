'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useDebounce } from '@/hooks/useDebounce'
import { useToast } from '@/hooks/useToast'
import { isValidUsername } from '@/lib/utils'
import { logout } from '@/services/auth.service'
import { ROUTES } from '@/lib/constants'
import TopBar from '@/components/layout/TopBar'
import AvatarUpload from '@/components/profile/AvatarUpload'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import ErrorMessage from '@/components/ui/ErrorMessage'
import Spinner from '@/components/ui/Spinner'

export default function ProfilePage() {
  const { user, profile, profileLoading } = useAuth()
  const { saving, error, success, saveProfile, checkUsername, clearStatus } = useProfile()
  const { toast } = useToast()
  const router = useRouter()

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)

  const debouncedUsername = useDebounce(username, 500)

  // Feltöltés a Firestore profil adataival
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName)
      setUsername(profile.username)
    }
  }, [profile])

  // Username elérhetőség ellenőrzés debounce-olva
  useEffect(() => {
    if (!debouncedUsername || !profile) return
    if (debouncedUsername === profile.username) {
      setUsernameAvailable(null) // nem változott, nincs szükség ellenőrzésre
      return
    }
    if (!isValidUsername(debouncedUsername)) {
      setUsernameAvailable(false)
      return
    }

    setCheckingUsername(true)
    checkUsername(debouncedUsername).then((available) => {
      setUsernameAvailable(available)
      setCheckingUsername(false)
    })
  }, [debouncedUsername, profile, checkUsername])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    clearStatus()

    const trimmedName = displayName.trim()
    const trimmedUsername = username.trim().toLowerCase()

    if (trimmedName.length < 2) return
    if (!isValidUsername(trimmedUsername)) return
    if (usernameAvailable === false) return

    const changed: Record<string, string> = {}
    if (trimmedName !== profile?.displayName) changed.displayName = trimmedName
    if (trimmedUsername !== profile?.username) changed.username = trimmedUsername

    if (Object.keys(changed).length === 0) return

    const ok = await saveProfile(changed)
    if (ok) toast('Profil mentve!', 'success')
  }

  async function handleLogout() {
    await logout()
    router.replace(ROUTES.LOGIN)
  }

  // Username mező állapot üzenete
  function getUsernameHint(): string | undefined {
    if (!username || username === profile?.username) return 'Egyedi azonosítód, amivel barátaid megkereshetnek'
    if (!isValidUsername(username)) return undefined
    if (checkingUsername) return 'Ellenőrzés...'
    if (usernameAvailable === true) return '✓ Elérhető'
    return undefined
  }

  function getUsernameError(): string | undefined {
    if (username && !isValidUsername(username)) {
      return 'Csak kisbetű, szám és _ használható (3–20 karakter)'
    }
    if (usernameAvailable === false && !checkingUsername) {
      return 'Ez a felhasználónév már foglalt'
    }
    return undefined
  }

  // Csak akkor spinner, ha ténylegesen tölt
  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  // Profil betöltött de nem létezik — nem maradunk spinner-ben
  if (!profile) {
    return (
      <>
        <TopBar title="Profil" />
        <div className="px-4 py-6 text-center text-muted-foreground">
          <p>Profil nem található.</p>
          <p className="text-sm mt-1">Próbálj kijelentkezni és visszalépni.</p>
          <Button variant="ghost" className="mt-4" onClick={handleLogout}>
            Kijelentkezés
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar title="Profil" />

      <div className="px-4 py-4 flex flex-col gap-6 max-w-lg mx-auto">

        {/* Profilkép */}
        <div className="flex justify-center py-2">
          <AvatarUpload
            uid={profile.uid}
            currentPhotoURL={profile.photoURL}
            displayName={profile.displayName}
          />
        </div>

        {/* Szerkesztő form */}
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Adatok szerkesztése
          </h2>

          <Input
            label="Megjelenített név"
            type="text"
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); clearStatus() }}
            placeholder="Pl. Kiss Péter"
            maxLength={40}
          />

          <div className="relative">
            <Input
              label="Felhasználónév"
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value.toLowerCase()); clearStatus() }}
              placeholder="pl. kispeter"
              maxLength={20}
              error={getUsernameError()}
              hint={getUsernameHint()}
            />
            {checkingUsername && (
              <div className="absolute right-3 top-9">
                <Spinner size="sm" />
              </div>
            )}
          </div>

          {/* Email — csak olvasható */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Email</label>
            <div className="rounded-xl border border-border bg-muted px-4 py-3 text-base text-muted-foreground min-h-[44px] flex items-center">
              {user?.email}
            </div>
          </div>

          <ErrorMessage message={error} />

          <Button
            type="submit"
            fullWidth
            loading={saving}
            disabled={
              usernameAvailable === false ||
              checkingUsername ||
              !displayName.trim() ||
              !isValidUsername(username)
            }
          >
            Mentés
          </Button>
        </form>

        {/* Kijelentkezés */}
        <div className="border-t border-border pt-4">
          <Button variant="ghost" fullWidth onClick={handleLogout}>
            Kijelentkezés
          </Button>
        </div>

      </div>
    </>
  )
}
