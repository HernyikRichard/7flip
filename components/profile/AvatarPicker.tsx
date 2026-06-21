'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Check, Loader2 } from 'lucide-react'
import { PROFILE_AVATARS } from '@/lib/profileAvatars'
import { updateUserProfile } from '@/services/user.service'
import { cn } from '@/lib/utils'

interface AvatarPickerProps {
  uid: string
  currentPhotoURL: string | null
  onSelected?: (src: string) => void
}

export default function AvatarPicker({ uid, currentPhotoURL, onSelected }: AvatarPickerProps) {
  const [selected, setSelected] = useState<string | null>(currentPhotoURL)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const hasChange = selected !== currentPhotoURL && selected !== null

  async function handleSave() {
    if (!selected || !hasChange) return
    setSaving(true)
    setStatus('idle')
    try {
      await updateUserProfile(uid, { photoURL: selected })
      setStatus('success')
      onSelected?.(selected)
    } catch {
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-0.5">
        Válassz avatart
      </p>

      <div className="flex gap-3 justify-between">
        {PROFILE_AVATARS.map((avatar) => {
          const isActive = selected === avatar.src
          return (
            <button
              key={avatar.id}
              type="button"
              onClick={() => { setSelected(avatar.src); setStatus('idle') }}
              aria-label={avatar.label}
              className={cn(
                'relative rounded-full transition-all active:scale-95 focus:outline-none',
                'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                isActive
                  ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-surface'
                  : 'opacity-70 hover:opacity-100'
              )}
            >
              <div className="relative w-14 h-14 rounded-full overflow-hidden">
                <Image
                  src={avatar.src}
                  alt={avatar.label}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              {isActive && (
                <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                  <Check size={11} className="text-white" strokeWidth={3} />
                </span>
              )}
            </button>
          )
        })}
      </div>

      {hasChange && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full h-11 rounded-2xl bg-primary-500 text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {saving
            ? <><Loader2 size={16} className="animate-spin" /> Mentés...</>
            : 'Mentés'
          }
        </button>
      )}

      {status === 'success' && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center font-medium">
          ✓ Profilkép frissítve
        </p>
      )}
      {status === 'error' && (
        <p className="text-xs text-red-500 text-center">
          Nem sikerült menteni a profilképet. Próbáld újra.
        </p>
      )}
    </div>
  )
}
