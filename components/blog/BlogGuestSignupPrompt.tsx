'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { trackBlogSignupPromptClick } from '@/lib/analytics/blog-events'
import { buildSignUpHref } from '@/lib/auth-redirect'
import { capForTier } from '@/lib/billing/caps'
import {
  readClientStorage,
  STORAGE_KEYS,
  writeClientStorage,
} from '@/lib/client-storage'
import { useAuthCheck } from '@/lib/hooks/useAuthCheck'

const DISMISS_MS = 7 * 24 * 60 * 60 * 1000
const SCROLL_THRESHOLD = 0.5

function isDismissedRecently(): boolean {
  const raw = readClientStorage(STORAGE_KEYS.blogSignupDismissed)
  if (!raw) return false
  const ts = Number.parseInt(raw, 10)
  if (!Number.isFinite(ts)) return false
  return Date.now() - ts < DISMISS_MS
}

function scrollDepth(): number {
  const doc = document.documentElement
  const maxScroll = doc.scrollHeight - window.innerHeight
  if (maxScroll <= 0) return 1
  return window.scrollY / maxScroll
}

type Props = {
  slug: string
}

/** Optional guest-only signup nudge — full article stays readable without an account. */
export function BlogGuestSignupPrompt({ slug }: Props) {
  const { user, loading } = useAuthCheck()
  const [dismissed, setDismissed] = useState(false)
  const [stickyVisible, setStickyVisible] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const signupHref = buildSignUpHref(`/blog/${slug}`)
  const freeCap = capForTier('free')

  useEffect(() => {
    setHydrated(true)
    setDismissed(isDismissedRecently())
  }, [])

  useEffect(() => {
    if (!hydrated || dismissed || user) return

    const onScroll = () => {
      setStickyVisible(scrollDepth() >= SCROLL_THRESHOLD)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [hydrated, dismissed, user])

  const dismiss = useCallback(() => {
    writeClientStorage(STORAGE_KEYS.blogSignupDismissed, String(Date.now()))
    setDismissed(true)
    setStickyVisible(false)
  }, [])

  const onSignupClick = useCallback(
    (prompt: 'banner' | 'sticky') => {
      trackBlogSignupPromptClick(prompt, slug)
    },
    [slug]
  )

  const scrollToArticle = useCallback(() => {
    document.getElementById('blog-article-body')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  if (!hydrated || loading || user) return null

  return (
    <>
      <aside
        className="ec-blog-guest-banner ec-blog-cta-banner"
        role="complementary"
        aria-label="Free account"
      >
        <p className="ec-blog-guest-banner__text">
          Reading as a guest — create a free account for{' '}
          <strong>{freeCap} marks/month</strong>, saved subjects, and a 7-day Pro trial. No card
          required.
        </p>
        <div className="ec-blog-guest-banner__actions">
          <Link
            href={signupHref}
            className="ec-btn-primary ec-btn-primary--sm min-h-[44px]"
            onClick={() => onSignupClick('banner')}
          >
            Sign up free
          </Link>
          <button type="button" className="ec-btn-underline text-sm" onClick={scrollToArticle}>
            Continue reading
          </button>
        </div>
      </aside>

      {stickyVisible && !dismissed ? (
        <aside
          className="ec-blog-signup-sticky"
          role="complementary"
          aria-label="Create a free account"
        >
          <p className="ec-blog-signup-sticky__text">
            Free account — {freeCap} marks/month, saved subjects, 7-day Pro trial.
          </p>
          <div className="ec-blog-signup-sticky__actions">
            <Link
              href={signupHref}
              className="ec-btn-primary ec-btn-primary--sm min-h-[44px]"
              onClick={() => onSignupClick('sticky')}
            >
              Sign up free
            </Link>
            <button
              type="button"
              className="ec-btn-ghost ec-btn-ghost--sm min-h-[44px]"
              onClick={dismiss}
            >
              Not now
            </button>
          </div>
        </aside>
      ) : null}
    </>
  )
}
