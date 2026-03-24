'use client'

import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { searchUsersByUsername } from '@/services/user.service'
import { useAuth } from '@/hooks/useAuth'
import Input from '@/components/ui/Input'
import FriendCard from './FriendCard'
import Spinner from '@/components/ui/Spinner'
import type { UserProfile } from '@/types'

interface FriendSearchProps {
  isFriend: (uid: string) => boolean
  hasPendingRequest: (uid: string) => boolean
  onSendRequest: (toUid: string) => Promise<void>
}

export default function FriendSearch({
  isFriend,
  hasPendingRequest,
  onSendRequest,
}: FriendSearchProps) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserProfile[]>([])
  const [searching, setSearching] = useState(false)
  const [sendingUid, setSendingUid] = useState<string | null>(null)
  const [sentUids, setSentUids] = useState<Set<string>>(new Set())

  const debouncedQuery = useDebounce(query, 400)

  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
      setResults([])
      return
    }
    if (!user) return

    setSearching(true)
    searchUsersByUsername(debouncedQuery.trim().toLowerCase(), user.uid)
      .then(setResults)
      .catch(console.error)
      .finally(() => setSearching(false))
  }, [debouncedQuery, user])

  async function handleSend(toUid: string) {
    setSendingUid(toUid)
    try {
      await onSendRequest(toUid)
      setSentUids((prev) => new Set(prev).add(toUid))
    } catch (err) {
      console.error(err)
    } finally {
      setSendingUid(null)
    }
  }

  function getActionProps(result: UserProfile) {
    if (isFriend(result.uid)) {
      return { label: 'Barát', variant: 'secondary' as const, onClick: () => {}, disabled: true }
    }
    if (sentUids.has(result.uid) || hasPendingRequest(result.uid)) {
      return { label: 'Elküldve', variant: 'secondary' as const, onClick: () => {}, disabled: true }
    }
    return {
      label: 'Hozzáad',
      variant: 'primary' as const,
      loading: sendingUid === result.uid,
      onClick: () => handleSend(result.uid),
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Keresés felhasználónév alapján..."
          className="w-full rounded-xl border border-border bg-surface pl-9 pr-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[44px]"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Spinner size="sm" />
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((result) => {
            const action = getActionProps(result)
            return (
              <FriendCard
                key={result.uid}
                uid={result.uid}
                displayName={result.displayName}
                username={result.username}
                photoURL={result.photoURL}
                primaryAction={action}
              />
            )
          })}
        </div>
      )}

      {!searching && debouncedQuery.length >= 2 && results.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          Nem találtunk ilyen felhasználót.
        </p>
      )}
    </div>
  )
}
