'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const SIZE_MAP = {
  sm: { px: 32, cls: 'h-8 w-8 text-xs' },
  md: { px: 40, cls: 'h-10 w-10 text-sm' },
  lg: { px: 56, cls: 'h-14 w-14 text-lg' },
  xl: { px: 80, cls: 'h-20 w-20 text-2xl' },
}

function getInitialsBg(name: string): string {
  const colors = [
    'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
    'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
  ]
  return colors[name.charCodeAt(0) % colors.length]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function isLocalPath(src: string): boolean {
  return src.startsWith('/')
}

export default function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const { px, cls } = SIZE_MAP[size]
  const [imgError, setImgError] = useState(false)

  const showImage = !!src && !imgError

  if (showImage) {
    // Local static assets can be rendered unoptimized to avoid domain config issues
    const unoptimized = isLocalPath(src)

    return (
      <div className={cn('relative shrink-0 overflow-hidden rounded-full', cls, className)}>
        <Image
          src={src}
          alt={name ?? 'Avatar'}
          fill
          sizes={`${px}px`}
          className="object-cover"
          unoptimized={unoptimized}
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  const initials = name ? getInitials(name) : '?'
  const bg = name ? getInitialsBg(name) : 'bg-muted'

  return (
    <div
      className={cn(
        'shrink-0 rounded-full flex items-center justify-center font-semibold text-white select-none',
        cls,
        bg,
        className
      )}
      aria-label={name ?? 'Avatar'}
    >
      {initials}
    </div>
  )
}
