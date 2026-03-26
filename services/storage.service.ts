import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import storage from '@/lib/firebase/storage'

// Kép átméretezése canvas-szal feltöltés előtt (max 400x400px, 80% minőség)
async function resizeImage(file: File, maxSize = 400): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1)
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas toBlob failed'))
      }, 'image/jpeg', 0.8)
    }
    img.onerror = reject
    img.src = url
  })
}

export async function uploadProfilePhoto(uid: string, file: File): Promise<string> {
  const resized = await resizeImage(file)
  const storageRef = ref(storage, `avatars/${uid}/profile.jpg`)
  await uploadBytes(storageRef, resized, { contentType: 'image/jpeg' })
  return getDownloadURL(storageRef)
}

