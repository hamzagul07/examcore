'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { BookOpen, MessageCircle, RotateCcw, Sparkles } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { trackBlogContinuePopupClick } from '@/lib/analytics/blog-events'
import { buildSignUpHref } from '@/lib/auth-redirect'
import { readClientStorage, STORAGE_KEYS, writeClientStorage } from '@/lib/client-storage'
import { useAuthCheck } from '@/lib/hooks/useAuthCheck'

const DISMISS_MS = 7 * 24 * 60 * 60 * 1000
const SCROLL_THRESHOLD = 0.45

type Props = {
  slug: string
  subjectCode?: string | null
}

function isDismissedRecently(): boolean {
  const raw = readClientStorage(STORAGE_KEYS.blogSignupDismissed)
  if (!raw) return false
  const ts = Number(raw)
  return Number.isFinite(ts) && Date.now() - ts < DISMISS_MS
}

function dismissPopup(): void {
  writeClientStorage(STORAGE_KEYS.blogSignupDismissed, String(Date.now()))
}

/**
 * Guest-only scroll popup — signup to continue, with exam discussion as a perk.
 * Dismissible; full article stays in the DOM for SEO.
 */
export function BlogContinueSignupModal({ slug, subjectCode = null }: Props) {
  const { user, loading } = useAuthCheck()
  const [hydrated, setHydrated] = useState(false)
  const [open, setOpen] = useState(false)
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated || loading || user || isDismissedRecently()) return

    setArmed(true)

    function onScroll() {
      if (open) return
      const el = document.documentElement
      const height = el.scrollHeight - el.clientHeight
      if (height <= 0) return
      const ratio = el.scrollTop / height
      if (ratio >= SCROLL_THRESHOLD) {
        setOpen(true)
        window.removeEventListener('scroll', onScroll)
      }
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [hydrated, loading, user, open])

  const close = useCallback(() => {
    dismissPopup()
    setOpen(false)
    trackBlogContinuePopupClick('dismiss', slug)
  }, [slug])

  if (!hydrated || loading || user || !armed) return null

  const signupHref = buildSignUpHref(`/blog/${slug}`)
  const communityHref = subjectCode ? `/community?subject=${subjectCode}` : '/community'
  const discussionLabel = subjectCode ? `${subjectCode} exam discussion` : 'exam discussions'

  return (
    <Sheet open={open} onClose={close} title="Sign up to continue reading">
      <div className="ec-blog-continue-popup pr-6">
        <div className="ec-blog-continue-popup__icon" aria-hidden>
          <BookOpen className="h-6 w-6 text-[var(--ec-brand)]" strokeWidth={1.75} />
        </div>

        <p className="ec-eyebrow mb-2">Keep reading</p>
        <h2 className="text-headline text-[var(--ec-text-primary)]">
          Sign up to <span className="italic text-[var(--ec-brand)]">continue</span>
        </h2>
        <p className="text-body mt-3 text-[var(--ec-text-secondary)]">
          Create a free account to pick up where you left off, get guides for your subjects, and
          read what students are asking in{' '}
          <strong className="font-semibold text-[var(--ec-text-primary)]">{discussionLabel}</strong>
          .
        </p>

        <ul className="ec-blog-continue-popup__list" aria-label="What you get">
          <li>
            <RotateCcw className="h-4 w-4 shrink-0 text-[var(--ec-brand)]" aria-hidden />
            Back to this guide after ~60 sec setup
          </li>
          <li>
            <BookOpen className="h-4 w-4 shrink-0 text-[var(--ec-brand)]" aria-hidden />
            Guides matched to your board &amp; subjects
          </li>
          <li>
            <MessageCircle className="h-4 w-4 shrink-0 text-[var(--ec-brand)]" aria-hidden />
            Read &amp; join {discussionLabel} — free
          </li>
        </ul>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href={signupHref}
            className="ec-btn-primary min-h-[48px] w-full justify-center"
            onClick={() => trackBlogContinuePopupClick('signup', slug)}
          >
            Create free account
          </Link>
          <button type="button" className="ec-btn-ghost min-h-[48px] w-full" onClick={close}>
            Continue reading
          </button>
          <Link
            href={communityHref}
            className="text-center text-sm font-semibold text-[var(--ec-brand)] hover:underline"
            onClick={() => trackBlogContinuePopupClick('community', slug)}
          >
            Browse exam discussions →
          </Link>
        </div>

        <p className="ec-blog-continue-popup__trust mt-4">
          <Sparkles className="inline h-3.5 w-3.5 align-text-bottom" aria-hidden />
          {' '}
          No card required · 7-day Pro trial
        </p>
      </div>
    </Sheet>
  )
}
