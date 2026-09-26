'use client'

import { useState, useCallback, useEffect, useId, useRef } from 'react'
import Link from 'next/link'
import { useAuthCheck } from '@/lib/hooks/useAuthCheck'
import { useCommunityNotifications } from '@/lib/hooks/useCommunityNotifications'
import { timeAgo } from '@/lib/community/format'
import { NOTIFICATIONS_EMPTY_TEXT, notificationIcon } from '@/lib/community/notification-icon'

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

/**
 * The notification bell and its panel.
 *
 * `alwaysOn` shows the bell even where the Exam Room is switched off: class
 * notifications (a teacher's hand-ins and seat decisions; a student's new
 * sets, reminders and feedback) are not community notifications, and neither
 * the teacher nav nor the signed-in app header may lose them with that flag.
 * `inboxHref` is where "See all notifications" goes (the teacher frame has
 * its own inbox page).
 *
 * The panel is a disclosure, not a menu: a button that controls a region of
 * plain links, closed by Escape (focus goes back to the bell) or a click
 * outside. The button's name carries the unread count.
 */
export function NotificationBell({
  dismiss = false,
  alwaysOn = false,
  inboxHref = '/community/notifications',
}: {
  dismiss?: boolean
  alwaysOn?: boolean
  inboxHref?: string
}) {
  const enabled = COMMUNITY_ON || alwaysOn
  const { user, loading } = useAuthCheck()
  const [items, setItems] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (dismiss) setOpen(false)
  }, [dismiss])

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/community/notifications?limit=12')
      // A failed read keeps what the bell already shows rather than emptying it.
      if (!res.ok) return
      const data = await res.json()
      setItems(data.notifications ?? [])
      setUnread(data.unread ?? 0)
    } catch {
      /* ignore */
    }
  }, [])

  useCommunityNotifications(enabled && user ? user.id : undefined, fetchNotifs, {
    onInsert: () => setUnread((c) => c + 1),
  })

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!enabled || loading || !user) return null

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
    <div className="notif-bell-wrap" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="notif-bell"
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
      >
        <span className="notif-bell-glyph" aria-hidden>
          N
        </span>
        {unread > 0 ? <span className="notif-badge">{unread > 9 ? '9+' : unread}</span> : null}
      </button>
      {open ? (
        <div className="notif-dropdown" id={panelId} role="region" aria-label="Notifications">
          <div className="notif-dropdown-head">
            <span className="notif-dropdown-title">Notifications</span>
            <Link href="/account/preferences" className="notif-dropdown-prefs" onClick={() => setOpen(false)}>
              Preferences
            </Link>
          </div>
          {items.length ? (
            items.map((n) => {
              const content = (
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
              const className = `notif-item${n.read ? '' : ' unread'}`
              // Notifications without a destination mark as read on tap
              // instead of navigating to a dead "#" link.
              return n.href ? (
                <Link key={n.id} href={n.href} className={className} onClick={() => openItem(n)}>
                  {content}
                </Link>
              ) : (
                <button
                  key={n.id}
                  type="button"
                  className={className}
                  onClick={() => openItem(n)}
                >
                  {content}
                </button>
              )
            })
          ) : (
            <p className="notif-empty">{NOTIFICATIONS_EMPTY_TEXT}</p>
          )}
          <Link href={inboxHref} className="notif-dropdown-all" onClick={() => setOpen(false)}>
            See all notifications
          </Link>
        </div>
      ) : null}
    </div>
  )
}
