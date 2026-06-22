'use client'

import { useEffect, useState } from 'react'
import { subscribeUsersStatus } from '@/services/userStatus.service'
import type { UserActiveGameStatus } from '@/types'

export function useFriendsActiveGames(
  friendUids: string[]
): Record<string, UserActiveGameStatus> {
  const [statuses, setStatuses] = useState<Record<string, UserActiveGameStatus>>({})
  const uidKey = friendUids.slice().sort().join(',')

  useEffect(() => {
    if (friendUids.length === 0) {
      setStatuses({})
      return
    }
    return subscribeUsersStatus(friendUids, setStatuses)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uidKey])

  return statuses
}
