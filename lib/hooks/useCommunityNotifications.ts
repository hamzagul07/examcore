'use client'

import { useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'

const POLL_FALLBACK_MS = 5 * 60_000

export type NotificationRefreshOptions = {
  /** Fired on realtime INSERT before the list refetch. */
  onInsert?: () => void
}

/** Realtime + slow poll fallback for Exam Room notifications. */
export function useCommunityNotifications(
  userId: string | undefined,
  onUpdate: () => void,
  options?: NotificationRefreshOptions
) {
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate
  const onInsertRef = useRef(options?.onInsert)
  onInsertRef.current = options?.onInsert

  const refresh = useCallback(() => {
    onUpdateRef.current()
  }, [])

  useEffect(() => {
    if (!userId) return

    refresh()
    const pollId = window.setInterval(refresh, POLL_FALLBACK_MS)

    const supabase = createClient()
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          onInsertRef.current?.()
          refresh()
        }
      )
      .subscribe()

    return () => {
      window.clearInterval(pollId)
      void supabase.removeChannel(channel)
    }
  }, [userId, refresh])
}
