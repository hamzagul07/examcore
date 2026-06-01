'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEcTheme } from '@/lib/design-system/ThemeProvider'
import { setWireframePaused } from '@/lib/dashboard/wireframe-pause'
import type { JournalSubjectPage } from '@/lib/dashboard/journal-data'
import {
  artDimensions,
  useDeviceTier,
  useWebGLBook,
} from '@/lib/hooks/useDeviceTier'
import { mapAttemptsToFlowParams } from '@/lib/generative/data-mapper'
import { renderFlowFieldArt } from '@/lib/generative/art-renderer'
import {
  buildArtCacheKey,
  readArtCache,
  writeArtCache,
} from '@/lib/generative/art-cache'
import { BookFallback } from './journal/BookFallback'

const BookSceneCanvas = dynamic(
  () => import('./journal/BookScene').then((m) => m.BookSceneCanvas),
  { ssr: false, loading: () => <JournalLoading /> }
)

const SESSION_OPEN_KEY = 'ec-journal-opened'

type Props = {
  userId: string
  firstName: string
  pages: JournalSubjectPage[]
}

function JournalLoading() {
  return (
    <div className="flex aspect-[4/3] w-[min(92vw,520px)] items-center justify-center">
      <p className="text-caption animate-pulse">Preparing your journal…</p>
    </div>
  )
}

export function StudyJournal({ userId, firstName, pages }: Props) {
  const reduce = useReducedMotion()
  const tier = useDeviceTier()
  const use3d = useWebGLBook(tier)
  const { theme } = useEcTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageTexture, setPageTexture] = useState<string | null>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const touchStart = useRef<number | null>(null)
  const containerRef = useRef<HTMLElement>(null)

  const current = pages[pageIndex]
  const hasPages = pages.length > 0

  useEffect(() => {
    setWireframePaused(true)
    return () => setWireframePaused(false)
  }, [])

  useEffect(() => {
    if (reduce || !hasPages) return
    try {
      if (sessionStorage.getItem(SESSION_OPEN_KEY)) return
    } catch {
      /* ignore */
    }
    const t = setTimeout(() => {
      setIsOpen(true)
      try {
        sessionStorage.setItem(SESSION_OPEN_KEY, '1')
      } catch {
        /* ignore */
      }
    }, 800)
    return () => clearTimeout(t)
  }, [reduce, hasPages])

  const bakeCurrentPage = useCallback(() => {
    if (!current) return
    const params = mapAttemptsToFlowParams(userId, current.subjectCode, current.attempts)
    const key = buildArtCacheKey(
      userId,
      current.subjectCode,
      current.attemptCount,
      current.latestAttemptId
    )
    const cached = readArtCache(key)
    if (cached) {
      setPageTexture(cached)
      return
    }
    const dim = artDimensions(tier)
    const url = renderFlowFieldArt(params, {
      width: dim.width,
      height: dim.height,
      subjectCode: current.subjectCode,
      zenMode: theme === 'zen',
    })
    writeArtCache(key, url)
    setPageTexture(url)
  }, [current, userId, tier, theme])

  useEffect(() => {
    if (use3d && isOpen && current) bakeCurrentPage()
  }, [use3d, isOpen, current, bakeCurrentPage])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (reduce || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const cx = (e.clientX - rect.left) / rect.width - 0.5
      const cy = (e.clientY - rect.top) / rect.height - 0.5
      setTilt({ x: cy * -0.06, y: cx * 0.06 })
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [reduce])

  const prev = () => setPageIndex((i) => Math.max(0, i - 1))
  const next = () => setPageIndex((i) => Math.min(pages.length - 1, i + 1))

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null || !isOpen) return
    const dx = e.changedTouches[0].clientX - touchStart.current
    if (dx > 50) prev()
    if (dx < -50) next()
    touchStart.current = null
  }

  const header = useMemo(
    () => (
      <div className="mb-3">
        <h2 className="text-title">Study journal</h2>
        <p className="text-caption mt-1">
          {hasPages
            ? 'Your marking history, one subject per page'
            : 'Mark questions to fill your journal'}
        </p>
      </div>
    ),
    [hasPages]
  )

  if (!use3d) {
    return (
      <section ref={containerRef} className="mb-8 min-w-0">
        {header}
        <BookFallback
          userId={userId}
          firstName={firstName}
          pages={pages}
          tier={tier}
          isOpen={isOpen}
          pageIndex={pageIndex}
          onOpen={() => setIsOpen(true)}
          onPageChange={setPageIndex}
          reduceMotion={!!reduce}
        />
      </section>
    )
  }

  return (
    <section
      ref={containerRef}
      className="mb-8 min-w-0"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {header}

      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="ec-card ec-shadow-elevation-2 mx-auto flex aspect-[4/3] w-[min(92vw,520px)] flex-col items-center justify-center rounded-lg border border-[var(--ec-border)] transition-transform hover:scale-[1.01]"
        >
          <p className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold">
            Your Study Journal
          </p>
          <p className="text-caption mt-2">{firstName}</p>
          {!hasPages && (
            <p className="text-caption mt-4 opacity-70">Mark questions to fill your journal</p>
          )}
        </button>
      ) : (
        <BookSceneCanvas
          tier={tier}
          reduceMotion={!!reduce}
          isOpen={isOpen}
          pageTexture={pageTexture}
          tilt={tilt}
        />
      )}

      {isOpen && hasPages && (
        <div className="mt-4 flex items-center justify-between gap-3 px-2">
          <button
            type="button"
            onClick={prev}
            disabled={pageIndex === 0}
            className="ec-btn-secondary min-h-[44px] min-w-[44px] p-2 disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="text-caption font-semibold">
            {current?.subjectLabel} · {pageIndex + 1} of {pages.length}
          </p>
          <button
            type="button"
            onClick={next}
            disabled={pageIndex >= pages.length - 1}
            className="ec-btn-secondary min-h-[44px] min-w-[44px] p-2 disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </section>
  )
}
