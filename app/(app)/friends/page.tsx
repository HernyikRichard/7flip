'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useFriends } from '@/hooks/useFriends'
import { useToast } from '@/hooks/useToast'
import TopBar from '@/components/layout/TopBar'
import FriendSearch from '@/components/friends/FriendSearch'
import FriendList from '@/components/friends/FriendList'
import Spinner from '@/components/ui/Spinner'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'

type Tab = 'friends' | 'search'

export default function FriendsPage() {
  const { user } = useAuth()
  const { friendships, incoming, loading, sendRequest, removeFriendship, isFriend, hasPendingRequest } = useFriends()
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('friends')

  async function handleSendRequest(toUid: string) {
    await sendRequest(toUid)
    toast('Barátkérés elküldve!', 'success')
  }

  async function handleRemove(friendshipId: string) {
    await removeFriendship(friendshipId)
    toast('Barát eltávolítva.', 'info')
  }

  if (!user) return null

  return (
    <>
      <TopBar
        title="Barátok"
        right={
          <Link
            href={ROUTES.FRIEND_REQUESTS}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Barátkérések"
          >
            <Bell size={20} />
            {incoming.length > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-[10px] font-bold text-white">
                {incoming.length > 9 ? '9+' : incoming.length}
              </span>
            )}
          </Link>
        }
      />

      <div className="px-4 py-5 flex flex-col gap-4 max-w-lg mx-auto">
        {/* Tabs */}
        <div className="flex rounded-xl bg-muted p-1 gap-1">
          {(['friends', 'search'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors',
                tab === t
                  ? 'bg-surface text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t === 'friends' ? (
                <span className="flex items-center justify-center gap-1.5">
                  Barátaim
                  {friendships.length > 0 && (
                    <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary-500/20 text-primary-600 dark:text-primary-400 text-[10px] font-bold">
                      {friendships.length}
                    </span>
                  )}
                </span>
              ) : 'Keresés'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : tab === 'friends' ? (
          <FriendList friendships={friendships} currentUid={user.uid} onRemove={handleRemove} />
        ) : (
          <FriendSearch isFriend={isFriend} hasPendingRequest={hasPendingRequest} onSendRequest={handleSendRequest} />
        )}
      </div>
    </>
  )
}
