'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useAuthCheck } from '@/lib/hooks/useAuthCheck'
import { useCommunityNotifications } from '@/lib/hooks/useCommunityNotifications'
import { timeAgo } from '@/lib/community/format'
import { NOTIFICATIONS_EMPTY_TEXT, notificationIcon } from '@/lib/community/notification-icon'
import { SkeletonBlock } from '@/components/ui/PageSkeleton'

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

/**
 * Every notification a signed-in user has — Exam Room replies, marks, and
 * class updates from a teacher (or, for a teacher, hand-ins and seat
 * decisions). Shared by /community/notifications and the teacher frame's
 * /teacher/notifications, so the copy is product-neutral.
 *
 * It says what is happening at every step: a skeleton until the first
 * answer, the empty text only when the list really is empty, and an inline
 * error with a retry when a read fails — a failed load never reads as "no
 * notifications yet".
 */
export function NotificationsInbox({ signInNext = '/community/notifications' }: { signInNext?: string }) {
  const { user, loading } = useAuthCheck()
  const [items, setItems] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (nextOffset = 0, append = false) => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/community/notifications?offset=${nextOffset}&limit=${PAGE_SIZE}`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { notifications?: Notif[]; unread?: number }
      const batch: Notif[] = data.notifications ?? []
      setItems((prev) => (append ? [...prev, ...batch] : batch))
      setUnread(data.unread ?? 0)
      setOffset(nextOffset + batch.length)
      setHasMore(batch.length === PAGE_SIZE)
      setLoaded(true)
    } catch {
      setError(
        append
          ? 'Could not load more notifications. Try again.'
          : 'Your notifications didn’t load. Check your connection and try again.'
      )
    } finally {
      setBusy(false)
    }
  }, [])

  useCommunityNotifications(user?.id, () => load(0, false))

  async function markAllRead() {
    setUnread(0)
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await fetch('/api/community/notifications', { method: 'POST' })
    } catch {
      /* the next load shows the true state */
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
        /* the next load shows the true state */
      }
    }
  }

  if (loading) {
    return <InboxSkeleton />
  }

  if (!user) {
    return (
      <div className="notif-inbox-empty">
        <p>Sign in to see your notifications.</p>
        <Link href={`/auth/signin?next=${encodeURIComponent(signInNext)}`} className="ec-btn-primary">
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
          <p className="ms-body-2" style={{ margin: 0 }} aria-live="polite">
            {!loaded ? ' ' : unread > 0 ? `${unread} unread` : 'All caught up'}
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

      {error && !loaded ? (
        <div className="ms-teacher-error" role="alert">
          <p className="ms-teacher-error__body">{error}</p>
          <div className="mt-3">
            <button
              type="button"
              className="ec-btn-secondary inline-flex min-h-[44px] items-center"
              onClick={() => void load(0, false)}
              disabled={busy}
            >
              {busy ? 'Loading…' : 'Try again'}
            </button>
          </div>
        </div>
      ) : !loaded ? (
        <InboxSkeleton rowsOnly />
      ) : items.length ? (
        <ul className="notif-inbox-list">
          {items.map((n) => (
            <li key={n.id}>
              {n.href ? (
                <Link
                  href={n.href}
                  className={`notif-inbox-item${n.read ? '' : ' unread'}`}
                  onClick={() => openItem(n)}
                >
                  <InboxItemBody n={n} />
                </Link>
              ) : (
                // No destination: marking it read is all a tap can do.
                <button
                  type="button"
                  className={`notif-inbox-item w-full text-left${n.read ? '' : ' unread'}`}
                  onClick={() => openItem(n)}
                >
                  <InboxItemBody n={n} />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="notif-inbox-empty-text">{NOTIFICATIONS_EMPTY_TEXT}</p>
      )}

      {loaded && error ? (
        <p className="ms-teacher-error__body" role="alert">
          {error}
        </p>
      ) : null}
      {loaded && hasMore ? (
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

function InboxItemBody({ n }: { n: Notif }) {
  return (
    <>
      <span className="notif-item-icon" aria-hidden>
        {notificationIcon(n.type)}
      </span>
      <span className="notif-item-main">
        <span className="notif-item-title">{n.title}</span>
        {n.body ? <span className="notif-item-body">{n.body}</span> : null}
        <span className="notif-item-time">{timeAgo(n.created_at)}</span>
      </span>
    </>
  )
}

/** Placeholder rows until the first answer (never the empty text, which would be a claim). */
function InboxSkeleton({ rowsOnly = false }: { rowsOnly?: boolean }) {
  return (
    <div className={rowsOnly ? 'flex flex-col gap-2' : 'notif-inbox'} aria-busy="true">
      <span className="sr-only" role="status">
        Loading your notifications…
      </span>
      {rowsOnly ? null : <SkeletonBlock className="h-8 w-48" />}
      {Array.from({ length: 4 }, (_, i) => (
        <SkeletonBlock key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}
