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
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { ROUTES } from '@/lib/constants'

type Tab = 'friends' | 'search'

export default function FriendsPage() {
  const { user } = useAuth()
  const {
    friendships,
    incoming,
    loading,
    sendRequest,
    removeFriendship,
    isFriend,
    hasPendingRequest,
  } = useFriends()
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
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Barátkérések"
          >
            <Bell size={20} />
            {incoming.length > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {incoming.length > 9 ? '9+' : incoming.length}
              </span>
            )}
          </Link>
        }
      />

      <div className="px-4 py-4 flex flex-col gap-4 max-w-lg mx-auto">

        {/* Tabs */}
        <div className="flex rounded-xl border border-border bg-muted p-1 gap-1">
          {(['friends', 'search'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-surface text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'friends' ? (
                <span className="flex items-center justify-center gap-1.5">
                  Barátaim
                  {friendships.length > 0 && (
                    <Badge variant="info">{friendships.length}</Badge>
                  )}
                </span>
              ) : (
                'Keresés'
              )}
            </button>
          ))}
        </div>

        {/* Tartalom */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : tab === 'friends' ? (
          <FriendList
            friendships={friendships}
            currentUid={user.uid}
            onRemove={handleRemove}
          />
        ) : (
          <FriendSearch
            isFriend={isFriend}
            hasPendingRequest={hasPendingRequest}
            onSendRequest={handleSendRequest}
          />
        )}

      </div>
    </>
  )
}
