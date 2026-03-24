'use client'

import { useEffect, useState, useCallback } from 'react'
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
import type { Friendship, FriendRequest } from '@/types'

interface UseFriendsReturn {
  friendships: Friendship[]
  incoming: FriendRequest[]
  outgoing: FriendRequest[]
  loading: boolean
  // Akciók
  sendRequest: (toUid: string) => Promise<void>
  acceptRequest: (requestId: string) => Promise<void>
  rejectRequest: (requestId: string) => Promise<void>
  cancelRequest: (requestId: string) => Promise<void>
  removeFriendship: (friendshipId: string) => Promise<void>
  // Segéd: adott uid barát-e már?
  isFriend: (uid: string) => boolean
  hasPendingRequest: (uid: string) => boolean
}

export function useFriends(): UseFriendsReturn {
  const { user } = useAuth()
  const [friendships, setFriendships] = useState<Friendship[]>([])
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
      setFriendships(data)
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

  const isFriend = useCallback(
    (uid: string) =>
      friendships.some((f) => f.userIds.includes(uid)),
    [friendships]
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
