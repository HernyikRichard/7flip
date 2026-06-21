export const PROFILE_AVATARS = [
  { id: 'royal',      label: 'Royal',      src: '/profile-avatars/flip7-royal.png' },
  { id: 'trickster',  label: 'Trickster',  src: '/profile-avatars/flip7-trickster.png' },
  { id: 'strategist', label: 'Strategist', src: '/profile-avatars/flip7-strategist.png' },
  { id: 'rebel',      label: 'Rebel',      src: '/profile-avatars/flip7-rebel.png' },
  { id: 'mystic',     label: 'Mystic',     src: '/profile-avatars/flip7-mystic.png' },
] as const

export type ProfileAvatarId = (typeof PROFILE_AVATARS)[number]['id']

/** Ellenőrzi, hogy a photoURL egy engedélyezett Flip7 avatar-e */
export function isFlip7Avatar(photoURL: string | null): boolean {
  if (!photoURL) return false
  return PROFILE_AVATARS.some((a) => a.src === photoURL)
}
