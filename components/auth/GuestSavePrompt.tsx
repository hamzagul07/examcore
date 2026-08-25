'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { buildContentGateSignUpHref } from '@/lib/auth-redirect'
import { useAuthCheck } from '@/lib/hooks/useAuthCheck'
import { hasGuestBrowseCookie, isSearchEngineCrawler } from '@/lib/guest-browse'

const DISMISS_KEY = 'ms:savePrompt:dismissedAt'
/** A dismissal is respected for a fortnight — long enough not to nag. */
const DISMISS_DAYS = 14
/** Reading time before there is plausibly anything worth saving. */
const EARN_MS = 45_000
/** How far down the page counts as actually reading rather than bouncing. */
const EARN_SCROLL = 0.35

/** Fire this to offer the account at a real milestone instead of on a timer. */
export const GUEST_EARN_EVENT = 'ms:guest-earned'

function recentlyDismissed(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    return Date.now() - Number(raw) < DISMISS_DAYS * 86_400_000
  } catch {
    return false
  }
}

/**
 * Asks a signed-out reader for an account once they have something to save.
 *
 * Replaces a modal that rendered *instead of* the page: a visitor arriving from
 * search was asked to create an account before seeing a single line of the
 * lesson they had searched for. This never blocks, never covers the text being
 * read, and only appears once the reader has actually engaged — 45 seconds and
 * a third of the page, or a genuine milestone like finishing the quick check.
 *
 * Dismissal is remembered for a fortnight. If someone says no, that is an
 * answer, not an invitation to ask again on the next page.
 *
 * Eligibility (signed-out, no guest-browse cookie, not a rendering crawler) is
 * decided HERE, client-side, at earn time. It used to be decided server-side in
 * GuestSignupGate — which made every gated content route dynamic and killed CDN
 * caching for the whole lesson library. By earn time (45s in) the shared auth
 * context has long resolved, so the check costs nothing.
 */
export function GuestSavePrompt() {
  const pathname = usePathname()
  const [show, setShow] = useState(false)
  const { user, loading: authLoading } = useAuthCheck()

  const earn = useCallback(() => {
    if (recentlyDismissed()) return
    setShow(true)
  }, [])

  useEffect(() => {
    if (recentlyDismissed()) return

    let dwell = 0
    let deepEnough = false

    const onScroll = () => {
      const h = document.documentElement
      const max = h.scrollHeight - h.clientHeight
      if (max <= 0) return
      if ((window.scrollY || h.scrollTop) / max >= EARN_SCROLL) deepEnough = true
    }

    const timer = window.setInterval(() => {
      // Time in a background tab is not reading.
      if (document.hidden) return
      dwell += 1000
      if (dwell >= EARN_MS && deepEnough) {
        earn()
        window.clearInterval(timer)
      }
    }, 1000)

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener(GUEST_EARN_EVENT, earn)
    onScroll()
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener(GUEST_EARN_EVENT, earn)
    }
  }, [earn])

  const dismiss = useCallback(() => {
    setShow(false)
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      /* private mode — it will ask again next visit, which is acceptable */
    }
  }, [])

  if (!show) return null
  // Signed-in readers have nothing to save that isn't already saved; a visitor
  // who chose "browse without an account" gave their answer for this session;
  // a JS-rendering crawler (Googlebot) must never index the nudge as content.
  // Checked at render, not earn, so signing in mid-read retracts the prompt.
  if (authLoading || user) return null
  if (hasGuestBrowseCookie()) return null
  if (typeof navigator !== 'undefined' && isSearchEngineCrawler(navigator.userAgent)) return null

  return (
    <aside className="ms-save-prompt" role="complementary" aria-label="Save your progress">
      <div className="ms-save-prompt-body">
        <p className="ms-save-prompt-title">File this progress?</p>
        <p className="ms-save-prompt-lead">
          You&rsquo;re partway through. A free desk remembers where you got to and
          builds your revision list from it.
        </p>
        <span className="ms-save-prompt-note" aria-hidden>
          no card — just an email
        </span>
      </div>
      <div className="ms-save-prompt-actions">
        <LoadingLink
          href={buildContentGateSignUpHref(pathname ?? '/')}
          className="ec-btn-primary ms-save-prompt-cta inline-flex items-center gap-2"
          loadingText="Opening desk…"
        >
          Open a desk
          <span className="font-mono text-[11px] font-bold" aria-hidden>
            -&gt;
          </span>
        </LoadingLink>
        <button type="button" className="ms-save-prompt-dismiss" onClick={dismiss}>
          Not now
        </button>
      </div>
    </aside>
  )
}
