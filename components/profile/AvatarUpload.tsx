'use client'

import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import { uploadProfilePhoto } from '@/services/storage.service'
import { updateUserProfile } from '@/services/user.service'
import { cn } from '@/lib/utils'

interface AvatarUploadProps {
  uid: string
  currentPhotoURL: string | null
  displayName: string
  onUploaded?: (url: string) => void
}

export default function AvatarUpload({
  uid,
  currentPhotoURL,
  displayName,
  onUploaded,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Csak képfájl tölthető fel.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('A kép mérete maximum 5 MB lehet.')
      return
    }

    setError(null)
    setUploading(true)
    try {
      const url = await uploadProfilePhoto(uid, file)
      await updateUserProfile(uid, { photoURL: url })
      onUploaded?.(url)
    } catch (err) {
      console.error(err)
      setError('Feltöltés sikertelen. Próbáld újra.')
    } finally {
      setUploading(false)
      // Reset input hogy ugyanaz a fájl újra kiválasztható legyen
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          'relative group rounded-full focus:outline-none',
          'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2'
        )}
        aria-label="Profilkép módosítása"
      >
        <Avatar src={currentPhotoURL} name={displayName} size="xl" />

        {/* Hover overlay */}
        <div className={cn(
          'absolute inset-0 rounded-full flex items-center justify-center',
          'bg-black/40 transition-opacity duration-150',
          uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}>
          {uploading
            ? <Loader2 size={24} className="text-white animate-spin" />
            : <Camera size={24} className="text-white" />
          }
        </div>
      </button>

      <p className="text-xs text-muted-foreground">
        {uploading ? 'Feltöltés...' : 'Koppints a módosításhoz'}
      </p>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
