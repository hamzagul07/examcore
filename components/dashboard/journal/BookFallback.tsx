'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PageContent } from './PageContent'
import type { JournalSubjectPage } from '@/lib/dashboard/journal-data'
import type { DeviceTier } from '@/lib/hooks/useDeviceTier'

type Props = {
  userId: string
  firstName: string
  pages: JournalSubjectPage[]
  tier: DeviceTier
  isOpen: boolean
  pageIndex: number
  onOpen: () => void
  onPageChange: (index: number) => void
  reduceMotion: boolean
}

export function BookFallback({
  userId,
  firstName,
  pages,
  tier,
  isOpen,
  pageIndex,
  onOpen,
  onPageChange,
  reduceMotion,
}: Props) {
  const hasPages = pages.length > 0
  const current = pages[pageIndex]

  const prev = () => onPageChange(Math.max(0, pageIndex - 1))
  const next = () => onPageChange(Math.min(pages.length - 1, pageIndex + 1))

  return (
    <div className="mx-auto w-full max-w-lg px-2" style={{ perspective: '1200px' }}>
      <div
        className={`relative mx-auto aspect-[4/3] w-[min(92vw,480px)] transition-transform duration-700 ${
          reduceMotion ? '' : isOpen ? '[transform:rotateX(2deg)]' : ''
        }`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {!isOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className="ec-card ec-shadow-elevation-2 group relative flex h-full w-full flex-col overflow-hidden rounded-lg border border-[var(--ec-border)] text-left transition-transform hover:scale-[1.01]"
            aria-label="Open your study journal"
          >
            <div
              className="absolute left-0 top-0 h-full w-3 rounded-l-lg"
              style={{ background: 'var(--ec-brand)' }}
              aria-hidden
            />
            <div className="flex flex-1 flex-col justify-center px-8 py-6 pl-10">
              <p className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[var(--ec-text-primary)] sm:text-3xl">
                Your Study Journal
              </p>
              <p className="text-caption mt-2">{firstName}</p>
              {!hasPages && (
                <p className="text-caption mt-6 opacity-70">
                  Mark questions to fill your journal
                </p>
              )}
            </div>
          </button>
        ) : (
          <div className="ec-card ec-shadow-elevation-2 relative h-full w-full overflow-hidden rounded-lg border border-[var(--ec-border)]">
            <div
              className="absolute left-0 top-0 z-10 h-full w-2"
              style={{ background: 'var(--ec-brand)' }}
              aria-hidden
            />
            {current && (
              <PageContent
                userId={userId}
                subjectCode={current.subjectCode}
                attempts={current.attempts}
                tier={tier}
              />
            )}
          </div>
        )}
      </div>

      {isOpen && hasPages && (
        <>
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={prev}
              disabled={pageIndex === 0}
              className="ec-btn-secondary min-h-[44px] min-w-[44px] p-2 disabled:opacity-40"
              aria-label="Previous subject page"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <p className="text-caption text-center font-semibold">
              {current?.subjectLabel} · {pageIndex + 1} of {pages.length}
            </p>
            <button
              type="button"
              onClick={next}
              disabled={pageIndex >= pages.length - 1}
              className="ec-btn-secondary min-h-[44px] min-w-[44px] p-2 disabled:opacity-40"
              aria-label="Next subject page"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <p className="text-caption mt-2 text-center opacity-60">
            Tap edges or arrows to turn pages
          </p>
        </>
      )}
    </div>
  )
}
