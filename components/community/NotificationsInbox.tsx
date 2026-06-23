'use client'

import { useCallback, useState } from 'react'
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

const PAGE_SIZE = 30

function notifIcon(type: string): string {
  if (type === 'reply') return '↩'
  if (type === 'digest') return '🔥'
  if (type === 'upvote' || type === 'comment_upvote') return '↑'
  if (type === 'mention') return '@'
  if (type === 'milestone') return '⭐'
  if (type === 'thread') return '🧵'
  return '💬'
}

export function NotificationsInbox() {
  const { user, loading } = useAuthCheck()
  const [items, setItems] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (nextOffset = 0, append = false) => {
    setBusy(true)
    try {
      const res = await fetch(
        `/api/community/notifications?offset=${nextOffset}&limit=${PAGE_SIZE}`
      )
      const data = await res.json()
      const batch: Notif[] = data.notifications ?? []
      setItems((prev) => (append ? [...prev, ...batch] : batch))
      setUnread(data.unread ?? 0)
      setOffset(nextOffset + batch.length)
      setHasMore(batch.length === PAGE_SIZE)
    } catch {
      /* ignore */
    }
    setBusy(false)
  }, [])

  useCommunityNotifications(user?.id, () => load(0, false))

  async function markAllRead() {
    setUnread(0)
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await fetch('/api/community/notifications', { method: 'POST' })
    } catch {
      /* ignore */
    }
  }

  async function openItem(n: Notif) {
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

  if (loading) {
    return <p className="notif-inbox-loading">Loading…</p>
  }

  if (!user) {
    return (
      <div className="notif-inbox-empty">
        <p>Sign in to see your Exam Room notifications.</p>
        <Link href="/auth/signin?next=/community/notifications" className="ec-btn-primary">
          Sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="notif-inbox">
      <div className="notif-inbox-head">
        <div>
          <h1 className="ms-h2" style={{ fontSize: 28, marginBottom: 4 }}>
            Notifications
          </h1>
          <p className="ms-body-2" style={{ margin: 0 }}>
            {unread > 0 ? `${unread} unread` : 'All caught up'}
          </p>
        </div>
        <div className="notif-inbox-actions">
          {unread > 0 ? (
            <button type="button" className="ec-btn-ghost" onClick={markAllRead}>
              Mark all read
            </button>
          ) : null}
          <Link href="/account/preferences" className="ec-btn-ghost">
            Email preferences
          </Link>
        </div>
      </div>

      {items.length ? (
        <ul className="notif-inbox-list">
          {items.map((n) => (
            <li key={n.id}>
              <Link
                href={n.href || '#'}
                className={`notif-inbox-item${n.read ? '' : ' unread'}`}
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
            </li>
          ))}
        </ul>
      ) : (
        <p className="notif-inbox-empty-text">
          No notifications yet — comment in Exam Room to get started.
        </p>
      )}

      {hasMore ? (
        <button
          type="button"
          className="ec-btn-ghost notif-inbox-more"
          disabled={busy}
          onClick={() => load(offset, true)}
        >
          {busy ? 'Loading…' : 'Load more'}
        </button>
      ) : null}
    </div>
  )
}
