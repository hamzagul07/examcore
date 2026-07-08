'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Lock, MessageCircle } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { trackBlogContinuePopupClick } from '@/lib/analytics/blog-events'
import { buildSignInHref, buildSignUpHref } from '@/lib/auth-redirect'
import {
  readSessionStorage,
  removeClientStorage,
  removeSessionStorage,
  STORAGE_KEYS,
} from '@/lib/client-storage'
import { useAuthCheck } from '@/lib/hooks/useAuthCheck'

const SCROLL_THRESHOLD = 0.12
const OPEN_DELAY_MS = 2000
const TITLE_ID = 'blog-continue-dialog-title'

type Props = {
  slug: string
  subjectCode?: string | null
  subjectName?: string | null
}

function dismissKey(slug: string): string {
  return `${STORAGE_KEYS.blogSignupDismissed}:${slug}`
}

function isDismissedThisSession(slug: string): boolean {
  return readSessionStorage(dismissKey(slug)) === '1'
}

/** Reliable scroll progress for window/document (0–1). */
function getScrollProgress(): number {
  const doc = document.documentElement
  const scrollTop = window.scrollY || doc.scrollTop || document.body.scrollTop || 0
  const maxScroll = Math.max(doc.scrollHeight, document.body.scrollHeight) - window.innerHeight
  if (maxScroll <= 0) return 1
  return scrollTop / maxScroll
}

function shouldOpenPopup(): boolean {
  const progress = getScrollProgress()
  const scrollTop = window.scrollY || document.documentElement.scrollTop || 0
  if (progress >= SCROLL_THRESHOLD) return true
  const maxScroll =
    Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) -
    window.innerHeight
  if (maxScroll <= 120 && scrollTop >= 16) return true
  return false
}

/**
 * Guest-only scroll popup — signup required to keep reading; skip is on the signup page.
 * Full article stays in the DOM for SEO; body is visually gated while open.
 */
export function BlogContinueSignupModal({
  slug,
  subjectCode = null,
}: Props) {
  const { user, loading } = useAuthCheck()
  const [hydrated, setHydrated] = useState(false)
  const [open, setOpen] = useState(false)
  const triggeredRef = useRef(false)

  useEffect(() => {
    setHydrated(true)
    removeClientStorage(STORAGE_KEYS.blogSignupDismissed)
    // Legacy global session key blocked popup on every blog post.
    removeSessionStorage(STORAGE_KEYS.blogSignupDismissed)
  }, [])

  const tryOpen = useCallback(
    (force = false) => {
      if (triggeredRef.current || isDismissedThisSession(slug)) return
      if (!force && !shouldOpenPopup()) return
      triggeredRef.current = true
      setOpen(true)
    },
    [slug]
  )

  useEffect(() => {
    if (!hydrated || loading || user || isDismissedThisSession(slug)) return

    function onScrollOrResize() {
      tryOpen()
    }

    tryOpen()

    const delayId = window.setTimeout(() => {
      tryOpen(true)
    }, OPEN_DELAY_MS)

    const article = document.getElementById('blog-article-body')
    let observer: IntersectionObserver | undefined
    if (article) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.12) {
              tryOpen()
            }
          }
        },
        { threshold: [0.12, 0.2, 0.35] }
      )
      observer.observe(article)
    }

    window.addEventListener('scroll', onScrollOrResize, { passive: true })
    window.addEventListener('resize', onScrollOrResize, { passive: true })
    return () => {
      window.clearTimeout(delayId)
      observer?.disconnect()
      window.removeEventListener('scroll', onScrollOrResize)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [hydrated, loading, slug, user, tryOpen])

  useEffect(() => {
    if (!open) {
      document.documentElement.classList.remove('ec-blog-gate-active')
      return
    }
    document.documentElement.classList.add('ec-blog-gate-active')
    return () => document.documentElement.classList.remove('ec-blog-gate-active')
  }, [open])

  const close = useCallback(() => {
    // Gate is not dismissible — readers use signup or skip on the signup page.
  }, [])

  const closeForNavigation = useCallback(() => {
    setOpen(false)
    document.documentElement.classList.remove('ec-blog-gate-active')
  }, [])

  if (!hydrated || loading || user || isDismissedThisSession(slug)) return null

  const articleHref = `/blog/${slug}`
  const communityHref = subjectCode ? `/community/s/${subjectCode}` : '/community'
  const signupHref = buildSignUpHref(articleHref)
  const signinHref = buildSignInHref(articleHref)
  const discussSignupHref = buildSignUpHref(communityHref)

  return (
    <Sheet
      open={open}
      onClose={close}
      dismissible={false}
      labelledById={TITLE_ID}
      className="ec-blog-continue-sheet sm:max-w-[420px] sm:overflow-hidden"
      compactPadding
      showHandle
    >
      <div className="ec-blog-continue-popup">
        <div className="ec-blog-continue-popup__body">
          <span className="ec-blog-continue-popup__icon" aria-hidden>
            <Lock className="h-5 w-5" />
          </span>
          <p className="ec-blog-continue-popup__eyebrow">Free to keep reading</p>

          <h2 id={TITLE_ID} className="ec-blog-continue-popup__title">
            Create a free account to keep reading
          </h2>
          <p className="ec-blog-continue-popup__lead">
            You&apos;re partway through this guide. Create a free account to unlock the
            full article and pick up right where you left off.
          </p>

          <div className="ec-blog-continue-popup__signup">
            <Link
              href={signupHref}
              className="ec-btn-primary ec-blog-continue-popup__signup-btn"
              onClick={() => {
                closeForNavigation()
                trackBlogContinuePopupClick('signup', slug)
              }}
            >
              Create free account &amp; keep reading
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
            <ul className="ec-blog-continue-popup__trust" aria-label="What's included">
              <li>
                <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Free forever
              </li>
              <li>
                <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                No card required
              </li>
              <li>
                <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Back to this article
              </li>
            </ul>
          </div>

          <p className="ec-blog-continue-popup__signin">
            Already have an account?{' '}
            <Link
              href={signinHref}
              onClick={() => {
                closeForNavigation()
                trackBlogContinuePopupClick('signin', slug)
              }}
            >
              Sign in
            </Link>
          </p>

          <div className="ec-blog-continue-popup__or" aria-hidden>
            <span>or</span>
          </div>

          <div className="ec-blog-continue-popup__discuss">
            <div className="ec-blog-continue-popup__discuss-meta">
              <div className="ec-discuss-live" aria-hidden>
                <span className="ec-discuss-live__dot" />
                Live now
              </div>
              <div className="ec-discuss-avatars" aria-hidden>
                <span className="ec-discuss-avatars__bubble ec-discuss-avatars__bubble--a">A</span>
                <span className="ec-discuss-avatars__bubble ec-discuss-avatars__bubble--b">M</span>
                <span className="ec-discuss-avatars__bubble ec-discuss-avatars__bubble--c">S</span>
                <span className="ec-discuss-avatars__more">+12</span>
              </div>
            </div>
            <p className="ec-blog-continue-popup__discuss-kicker">Exam discussion</p>
            <p className="ec-blog-continue-popup__discuss-title">
              Talk with students revising the same papers
            </p>
            <Link
              href={discussSignupHref}
              className="ec-btn-secondary ec-blog-continue-popup__discuss-btn"
              onClick={() => {
                closeForNavigation()
                trackBlogContinuePopupClick('community', slug)
              }}
            >
              <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
              Discuss with other students
              <ArrowRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </Sheet>
  )
}
