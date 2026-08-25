'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { trackFunnelEvent } from '@/lib/analytics/funnel'
import { useBillingAccess } from '@/lib/hooks/useBillingAccess'

/**
 * The premium tier, discoverable where people actually spend time — lessons,
 * guides, blog posts — not only on /pricing and at the quota wall.
 *
 * Rules that keep it from becoming a nag:
 * - inline card, never a popup: content pages are prerendered SEO surfaces
 *   and intrusive interstitials cost rankings as well as goodwill;
 * - renders nothing until the client knows the visitor is signed out or on
 *   the free tier — paid students never see it, not even a flash (and the
 *   server render stays identical for everyone, so the pages stay static);
 * - one dismissal quiets every surface for a fortnight, same contract as the
 *   save prompt: a "no" is an answer, not an invitation to ask again.
 *
 * Each surface reports its own source tag, so the funnel readout can rank
 * placements by real clicks instead of taste.
 */
const QUIET_KEY = 'ms:premiumNudge:quietUntil'
const QUIET_DAYS = 14

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

export function PremiumNudge({ surface }: { surface: Surface }) {
  const { access } = useBillingAccess()
  const [dismissed, setDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const seenRef = useRef(false)

  useEffect(() => setMounted(true), [])

  const show = mounted && !dismissed && access === 'free' && !quiet()

  useEffect(() => {
    if (!show || seenRef.current) return
    seenRef.current = true
    trackFunnelEvent('upgrade_viewed', { source: `nudge_${surface}` })
  }, [show, surface])

  if (!show) return null
  const copy = COPY[surface]

  return (
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
          onClick={() => {
            setDismissed(true)
            try {
              window.localStorage.setItem(
                QUIET_KEY,
                String(Date.now() + QUIET_DAYS * 86_400_000)
              )
            } catch {
              /* private mode — it will ask again next visit */
            }
          }}
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
  )
}
