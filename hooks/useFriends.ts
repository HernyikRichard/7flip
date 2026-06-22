'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useAuth } from './useAuth'
import {
  subscribeFriendships,
  subscribeIncomingRequests,
  subscribeOutgoingRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
} from '@/services/friend.service'
import { subscribeUserProfiles } from '@/services/user.service'
import type { Friendship, FriendRequest, UserProfile } from '@/types'

interface UseFriendsReturn {
  friendships: Friendship[]
  incoming: FriendRequest[]
  outgoing: FriendRequest[]
  loading: boolean
  sendRequest: (toUid: string) => Promise<void>
  acceptRequest: (requestId: string) => Promise<void>
  rejectRequest: (requestId: string) => Promise<void>
  cancelRequest: (requestId: string) => Promise<void>
  removeFriendship: (friendshipId: string) => Promise<void>
  isFriend: (uid: string) => boolean
  hasPendingRequest: (uid: string) => boolean
}

export function useFriends(): UseFriendsReturn {
  const { user } = useAuth()
  const [rawFriendships, setRawFriendships] = useState<Friendship[]>([])
  const [friendProfiles, setFriendProfiles] = useState<Record<string, UserProfile>>({})
  const [incoming, setIncoming] = useState<FriendRequest[]>([])
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    let loadedCount = 0
    const checkDone = () => {
      loadedCount++
      if (loadedCount >= 3) setLoading(false)
    }

    const unsubF = subscribeFriendships(user.uid, (data) => {
      setRawFriendships(data)
      checkDone()
    })
    const unsubI = subscribeIncomingRequests(user.uid, (data) => {
      setIncoming(data)
      checkDone()
    })
    const unsubO = subscribeOutgoingRequests(user.uid, (data) => {
      setOutgoing(data)
      checkDone()
    })

    return () => {
      unsubF()
      unsubI()
      unsubO()
    }
  }, [user])

  // Barátok uid-jai — friss profil lekéréshez
  const friendUids = useMemo(() => {
    if (!user) return []
    return rawFriendships
      .map((f) => f.userIds.find((id) => id !== user.uid))
      .filter(Boolean) as string[]
  }, [rawFriendships, user])

  const friendUidKey = friendUids.slice().sort().join(',')

  useEffect(() => {
    if (friendUids.length === 0) { setFriendProfiles({}); return }
    return subscribeUserProfiles(friendUids, setFriendProfiles)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendUidKey])

  // Mergelés: denormalizált friendship adat + élő profil (photoURL, displayName)
  const friendships = useMemo<Friendship[]>(() => {
    if (Object.keys(friendProfiles).length === 0) return rawFriendships
    return rawFriendships.map((f) => {
      const enrichedUsers = { ...f.users }
      Object.keys(enrichedUsers).forEach((uid) => {
        const profile = friendProfiles[uid]
        if (profile) {
          enrichedUsers[uid] = {
            ...enrichedUsers[uid],
            photoURL: profile.photoURL,
            displayName: profile.displayName,
          }
        }
      })
      return { ...f, users: enrichedUsers }
    })
  }, [rawFriendships, friendProfiles])

  const isFriend = useCallback(
    (uid: string) => rawFriendships.some((f) => f.userIds.includes(uid)),
    [rawFriendships]
  )

  const hasPendingRequest = useCallback(
    (uid: string) =>
      outgoing.some((r) => r.toUid === uid) ||
      incoming.some((r) => r.fromUid === uid),
    [outgoing, incoming]
  )

  const sendRequest = useCallback(
    async (toUid: string) => {
      if (!user) return
      await sendFriendRequest(user.uid, toUid)
    },
    [user]
  )

  const acceptRequest = useCallback(async (requestId: string) => {
    await acceptFriendRequest(requestId)
  }, [])

  const rejectRequest = useCallback(async (requestId: string) => {
    await rejectFriendRequest(requestId)
  }, [])

  const cancelRequest = useCallback(async (requestId: string) => {
    await cancelFriendRequest(requestId)
  }, [])

  const removeFriendship = useCallback(async (friendshipId: string) => {
    await removeFriend(friendshipId)
  }, [])

  return {
    friendships,
    incoming,
    outgoing,
    loading,
    sendRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    removeFriendship,
    isFriend,
    hasPendingRequest,
  }
}
