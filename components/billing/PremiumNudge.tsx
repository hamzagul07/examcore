'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { trackFunnelEvent } from '@/lib/analytics/funnel'
import { useBillingAccess } from '@/lib/hooks/useBillingAccess'

/**
 * Premium, discoverable where people actually spend time — lessons, guides,
 * blog posts — in two forms:
 *
 * 1. A floating slide-in (the founder's "little page that pops up"), earned
 *    the way the guest save prompt earns: ~20s of reading or a third of the
 *    page. It uses the save prompt's own visual system (`ms-save-prompt`
 *    classes) so the two feel like one family, and at most one of them can
 *    appear on a page:
 *      - signed-in free reader  → this toast (they have an account; the ask
 *        is a plan);
 *      - signed-out on lessons/guides → GuestSavePrompt owns the slot (an
 *        account is the right first ask; a paid pitch before signup is
 *        backwards) — here we stay inline-only;
 *      - signed-out on blog → this toast (no save prompt exists there).
 *    Shown at most once per session; dismissing quiets every surface for a
 *    fortnight. Never a modal: content pages are prerendered SEO surfaces,
 *    and intrusive interstitials cost rankings as well as goodwill.
 *
 * 2. The inline card at the end of the content — the passive endcap for
 *    readers who finish. First measurement showed it renders ~13 viewports
 *    down on long posts, which is why the floating form exists.
 *
 * Paid students see neither — the gate is client-side, so the pages stay
 * static. Each form and surface reports its own funnel source tag
 * (`nudge_{surface}` / `nudge_float_{surface}`), so the readout can rank
 * placements by real clicks.
 */
const QUIET_KEY = 'ms:premiumNudge:quietUntil'
const QUIET_DAYS = 14
const SESSION_KEY = 'ms:premiumToast:shown'
/** Reading time before a plans ask is plausibly welcome. */
const EARN_MS = 20_000
const EARN_SCROLL = 0.3

type Surface = 'lesson' | 'guide' | 'blog'

const COPY: Record<Surface, { title: string; body: string }> = {
  lesson: {
    title: 'Read it. Now get it marked.',
    body: 'This topic has real past-paper questions — write one, and the examiner’s ink lands on your own working, scheme codes in the margin. Plans take marking to 50–250 questions a month.',
  },
  guide: {
    title: 'Reading is half.',
    body: 'The other half is your own handwriting with scheme codes stamped on it — the reason beside every mark you dropped. That is what MarkScheme plans are for.',
  },
  blog: {
    title: 'Your next past paper, marked.',
    body: 'MarkScheme stamps the real mark scheme onto your handwritten answer and shows the reason beside every mark — free to try, plans when it sticks.',
  },
}

function quiet(): boolean {
  try {
    const until = window.localStorage.getItem(QUIET_KEY)
    return !!until && Date.now() < Number(until)
  } catch {
    return false
  }
}

function goQuiet(): void {
  try {
    window.localStorage.setItem(QUIET_KEY, String(Date.now() + QUIET_DAYS * 86_400_000))
  } catch {
    /* private mode — it will ask again next visit */
  }
}

function sessionShown(): boolean {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function PremiumNudge({ surface }: { surface: Surface }) {
  const { access, summary } = useBillingAccess()
  const [dismissed, setDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [floating, setFloating] = useState(false)
  const seenInlineRef = useRef(false)
  const seenFloatRef = useRef(false)

  useEffect(() => setMounted(true), [])

  const free = access === 'free'
  const signedIn = summary?.signedIn === true
  const showInline = mounted && !dismissed && free && !quiet()
  // The save prompt owns the floating slot for signed-out readers on gated
  // content; the blog has no save prompt, so the toast may float there.
  const floatEligible = free && (signedIn || surface === 'blog')

  useEffect(() => {
    if (!mounted || !floatEligible || quiet() || sessionShown()) return
    let dwell = 0
    let deepEnough = false
    const onScroll = () => {
      const h = document.documentElement
      const max = h.scrollHeight - h.clientHeight
      if (max <= 0) return
      if ((window.scrollY || h.scrollTop) / max >= EARN_SCROLL) deepEnough = true
    }
    const timer = window.setInterval(() => {
      if (document.hidden) return
      dwell += 1000
      if (dwell >= EARN_MS || deepEnough) {
        window.clearInterval(timer)
        window.removeEventListener('scroll', onScroll)
        try {
          window.sessionStorage.setItem(SESSION_KEY, '1')
        } catch {
          /* best effort */
        }
        setFloating(true)
      }
    }, 1000)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [mounted, floatEligible])

  useEffect(() => {
    if (!showInline || seenInlineRef.current) return
    seenInlineRef.current = true
    trackFunnelEvent('upgrade_viewed', { source: `nudge_${surface}` })
  }, [showInline, surface])

  useEffect(() => {
    if (!floating || seenFloatRef.current) return
    seenFloatRef.current = true
    trackFunnelEvent('upgrade_viewed', { source: `nudge_float_${surface}` })
  }, [floating, surface])

  const dismissAll = useCallback(() => {
    setDismissed(true)
    setFloating(false)
    goQuiet()
  }, [])

  if (!mounted || !free) return null
  const copy = COPY[surface]

  return (
    <>
      {floating && !dismissed ? (
        <aside
          className="ms-save-prompt"
          role="complementary"
          aria-label="MarkScheme plans"
        >
          <div className="ms-save-prompt-body">
            <p className="ms-save-prompt-title">{copy.title}</p>
            <p className="ms-save-prompt-lead">{copy.body}</p>
          </div>
          <div className="ms-save-prompt-actions">
            <Link
              href="/pricing"
              prefetch={false}
              className="ec-btn-primary ms-save-prompt-cta inline-flex items-center gap-2"
              onClick={() =>
                trackFunnelEvent('upsell_clicked', { source: `nudge_float_${surface}` })
              }
            >
              See plans
              <span className="font-mono text-[11px] font-bold" aria-hidden>
                -&gt;
              </span>
            </Link>
            <button type="button" className="ms-save-prompt-dismiss" onClick={dismissAll}>
              Not now
            </button>
          </div>
        </aside>
      ) : null}

      {showInline ? (
        <aside
          className="mx-auto my-10 max-w-[var(--ec-reading-measure,68ch)] rounded-xl border-2 border-[var(--ec-border)] bg-[var(--ec-surface-raised)] px-5 py-4"
          style={{ boxShadow: 'var(--ec-shadow-hard, 4px 4px 0 rgba(0,0,0,0.10))' }}
          aria-label="MarkScheme plans"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-serif text-lg font-bold text-[var(--ec-text-primary)]">
              {copy.title}
            </p>
            <button
              type="button"
              aria-label="Dismiss"
              className="text-sm text-[var(--ec-text-secondary)]"
              onClick={dismissAll}
            >
              ✕
            </button>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
            {copy.body}
          </p>
          <Link
            href="/pricing"
            prefetch={false}
            className="ec-btn-primary ec-btn-primary--sm mt-3 inline-flex"
            onClick={() =>
              trackFunnelEvent('upsell_clicked', { source: `nudge_${surface}` })
            }
          >
            See plans →
          </Link>
        </aside>
      ) : null}
    </>
  )
}
