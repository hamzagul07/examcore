'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useAuthCheck } from '@/lib/hooks/useAuthCheck'

type Notif = { id: string; title: string; href: string | null; read: boolean; created_at: string }

const COMMUNITY_ON = process.env.NEXT_PUBLIC_COMMUNITY_ENABLED === 'true'

export function NotificationBell() {
  const { user, loading } = useAuthCheck()
  const [items, setItems] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/community/notifications')
      const data = await res.json()
      setItems(data.notifications ?? [])
      setUnread(data.unread ?? 0)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (COMMUNITY_ON && user) fetchNotifs()
  }, [user, fetchNotifs])

  if (!COMMUNITY_ON || loading || !user) return null

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && unread > 0) {
      setUnread(0)
      try {
        await fetch('/api/community/notifications', { method: 'POST' })
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <div className="notif-bell-wrap">
      <button type="button" className="notif-bell" onClick={toggle} aria-label="Notifications">
        🔔
        {unread > 0 ? <span className="notif-badge">{unread > 9 ? '9+' : unread}</span> : null}
      </button>
      {open ? (
        <div className="notif-dropdown" role="menu">
          {items.length ? (
            items.map((n) => (
              <Link key={n.id} href={n.href || '#'} className="notif-item" onClick={() => setOpen(false)}>
                {n.title}
              </Link>
            ))
          ) : (
            <p className="notif-empty">No notifications yet.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
