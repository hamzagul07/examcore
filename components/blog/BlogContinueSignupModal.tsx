'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  MessageCircle,
  RotateCcw,
  Sparkles,
  Users,
} from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { trackBlogContinuePopupClick } from '@/lib/analytics/blog-events'
import { buildSignUpHref } from '@/lib/auth-redirect'
import { readClientStorage, STORAGE_KEYS, writeClientStorage } from '@/lib/client-storage'
import { useAuthCheck } from '@/lib/hooks/useAuthCheck'

const DISMISS_MS = 7 * 24 * 60 * 60 * 1000
const SCROLL_THRESHOLD = 0.2
const TITLE_ID = 'blog-continue-dialog-title'

type Props = {
  slug: string
  subjectCode?: string | null
  subjectName?: string | null
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

/** Reliable scroll progress for window/document (0–1). */
function getScrollProgress(): number {
  const doc = document.documentElement
  const scrollTop = window.scrollY || doc.scrollTop || document.body.scrollTop || 0
  const maxScroll = Math.max(doc.scrollHeight, document.body.scrollHeight) - window.innerHeight
  if (maxScroll <= 0) return scrollTop > 0 ? 1 : 0
  return scrollTop / maxScroll
}

function shouldOpenPopup(): boolean {
  const progress = getScrollProgress()
  const scrollTop = window.scrollY || document.documentElement.scrollTop || 0
  // Short pages: any meaningful scroll counts once past threshold or ~20% equivalent
  if (progress >= SCROLL_THRESHOLD) return true
  const maxScroll =
    Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) -
    window.innerHeight
  if (maxScroll <= 80 && scrollTop >= 24) return true
  return false
}

const PERKS = [
  { icon: RotateCcw, label: 'Pick up where you left off' },
  { icon: BookOpen, label: 'Guides for your subjects' },
  { icon: Sparkles, label: '7-day Pro trial' },
] as const

/**
 * Guest-only scroll popup — friendly signup + exam discussion.
 * Dismissible; full article stays in the DOM for SEO.
 */
export function BlogContinueSignupModal({
  slug,
  subjectCode = null,
  subjectName = null,
}: Props) {
  const { user, loading } = useAuthCheck()
  const [hydrated, setHydrated] = useState(false)
  const [open, setOpen] = useState(false)
  const triggeredRef = useRef(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const tryOpen = useCallback(() => {
    if (triggeredRef.current) return
    if (!shouldOpenPopup()) return
    triggeredRef.current = true
    setOpen(true)
  }, [])

  useEffect(() => {
    if (!hydrated || loading || user || isDismissedRecently()) return

    function onScrollOrResize() {
      tryOpen()
    }

    tryOpen()
    window.addEventListener('scroll', onScrollOrResize, { passive: true })
    window.addEventListener('resize', onScrollOrResize, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScrollOrResize)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [hydrated, loading, user, tryOpen])

  const close = useCallback(() => {
    dismissPopup()
    setOpen(false)
    trackBlogContinuePopupClick('dismiss', slug)
  }, [slug])

  const closeForNavigation = useCallback(() => {
    setOpen(false)
  }, [])

  if (!hydrated || loading || user || isDismissedRecently()) return null

  const signupHref = buildSignUpHref(`/blog/${slug}`)
  const communityHref = subjectCode ? `/community/s/${subjectCode}` : '/community'
  const roomLabel = subjectCode
    ? subjectName
      ? `${subjectCode} ${subjectName}`
      : subjectCode
    : 'your subjects'

  return (
    <Sheet
      open={open}
      onClose={close}
      labelledById={TITLE_ID}
      className="ec-blog-continue-sheet border-0 sm:max-w-[420px] sm:overflow-hidden"
      compactPadding
      showHandle
    >
      <div className="ec-blog-continue-popup">
        <div className="ec-blog-continue-popup__hero" aria-hidden>
          <div className="ec-blog-continue-popup__orb" />
        </div>

        <div className="ec-blog-continue-popup__body">
          <div className="ec-blog-continue-popup__badge">
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            Keep going
          </div>

          <h2 id={TITLE_ID} className="ec-blog-continue-popup__title">
            Enjoying this guide?
          </h2>
          <p className="ec-blog-continue-popup__lead">
            Join free to save your place, get guides matched to your papers, and see what other
            students are asking right now.
          </p>

          <ul className="ec-blog-continue-popup__perks" aria-label="Free account includes">
            {PERKS.map(({ icon: Icon, label }) => (
              <li key={label}>
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {label}
              </li>
            ))}
          </ul>

          <div className="ec-blog-continue-popup__discuss">
            <div className="ec-blog-continue-popup__discuss-head">
              <span className="ec-blog-continue-popup__discuss-icon" aria-hidden>
                <Users className="h-5 w-5" />
              </span>
              <div>
                <p className="ec-blog-continue-popup__discuss-kicker">Exam discussion</p>
                <p className="ec-blog-continue-popup__discuss-title">
                  {subjectCode ? (
                    <>Ask &amp; read in the {roomLabel} room</>
                  ) : (
                    <>Talk with students revising the same papers</>
                  )}
                </p>
              </div>
            </div>
            <p className="ec-blog-continue-popup__discuss-copy">
              Past-paper tips, grade boundaries, and &ldquo;how do I answer this?&rdquo; — browse
              free without an account. Sign up when you want to post and get replies.
            </p>
            <Link
              href={communityHref}
              className="ec-btn-discuss"
              onClick={() => {
                closeForNavigation()
                trackBlogContinuePopupClick('community', slug)
              }}
            >
              <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
              Discuss with other students
              <ArrowRight className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            </Link>
          </div>

          <div className="ec-blog-continue-popup__signup">
            <p className="ec-blog-continue-popup__signup-label">Save this guide</p>
            <Link
              href={signupHref}
              className="ec-btn-primary ec-blog-continue-popup__signup-btn"
              onClick={() => {
                closeForNavigation()
                trackBlogContinuePopupClick('signup', slug)
              }}
            >
              Create free account
            </Link>
            <p className="ec-blog-continue-popup__trust">
              No card required · ~60 sec setup · back to this article
            </p>
          </div>

          <button
            type="button"
            className="ec-blog-continue-popup__skip"
            onClick={close}
          >
            Continue reading without signing up
          </button>
        </div>
      </div>
    </Sheet>
  )
}
