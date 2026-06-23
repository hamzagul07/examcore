'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useAuthCheck } from '@/lib/hooks/useAuthCheck'
import { useCommunityNotifications } from '@/lib/hooks/useCommunityNotifications'
import { timeAgo } from '@/lib/community/format'

type Notif = {
  id: string
  type: string
  title: string
  body: string | null
  href: string | null
  read: boolean
  created_at: string
}

const COMMUNITY_ON = process.env.NEXT_PUBLIC_COMMUNITY_ENABLED === 'true'

function notifIcon(type: string): string {
  if (type === 'reply') return '↩'
  if (type === 'digest') return '🔥'
  if (type === 'upvote' || type === 'comment_upvote') return '↑'
  if (type === 'mention') return '@'
  if (type === 'milestone') return '⭐'
  return '💬'
}

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

  useCommunityNotifications(COMMUNITY_ON && user ? user.id : undefined, fetchNotifs)

  if (!COMMUNITY_ON || loading || !user) return null

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && unread > 0) {
      setUnread(0)
      setItems((prev) => prev.map((n) => ({ ...n, read: true })))
      try {
        await fetch('/api/community/notifications', { method: 'POST' })
      } catch {
        /* ignore */
      }
    }
  }

  async function openItem(n: Notif) {
    setOpen(false)
    if (!n.read) {
      setItems((prev) => prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)))
      setUnread((c) => Math.max(0, c - 1))
      try {
        await fetch('/api/community/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: n.id }),
        })
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <div className="notif-bell-wrap">
      <button type="button" className="notif-bell" onClick={toggle} aria-label="Notifications" aria-expanded={open}>
        🔔
        {unread > 0 ? <span className="notif-badge">{unread > 9 ? '9+' : unread}</span> : null}
      </button>
      {open ? (
        <div className="notif-dropdown" role="menu">
          <div className="notif-dropdown-head">
            <span className="notif-dropdown-title">Notifications</span>
            <Link href="/account/preferences" className="notif-dropdown-prefs" onClick={() => setOpen(false)}>
              Preferences
            </Link>
          </div>
          {items.length ? (
            items.map((n) => (
              <Link
                key={n.id}
                href={n.href || '#'}
                className={`notif-item${n.read ? '' : ' unread'}`}
                onClick={() => openItem(n)}
              >
                <span className="notif-item-icon" aria-hidden>
                  {notifIcon(n.type)}
                </span>
                <span className="notif-item-main">
                  <span className="notif-item-title">{n.title}</span>
                  {n.body ? <span className="notif-item-body">{n.body}</span> : null}
                  <span className="notif-item-time">{timeAgo(n.created_at)}</span>
                </span>
              </Link>
            ))
          ) : (
            <p className="notif-empty">No notifications yet — comment in Exam Room to get started.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
