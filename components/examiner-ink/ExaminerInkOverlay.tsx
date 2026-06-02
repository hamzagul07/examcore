'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Eye } from 'lucide-react'
import { MarginNote } from './MarginNote'
import { MarkStamp } from './MarkStamp'
import { UnderlineMark } from './UnderlineMark'
import {
  ERROR_LABELS,
  type ErrorClassification,
} from '@/lib/error-classifications'

export interface LineReference {
  mark_id: string
  earned: boolean
  margin_note: string | null
  error_classification: ErrorClassification | string
  bbox: { top: number; left: number; width: number; height: number } | null
  snippet: string
}

interface ExaminerInkOverlayProps {
  imageUrl: string
  lineReferences: LineReference[]
  /** When set, expired signed URLs are refreshed once on load error. */
  attemptId?: string
  /** Storage path used with attemptId for multi-page refresh. */
  photoRef?: string
  /** When true, marks reveal sequentially as if being drawn live. */
  animate?: boolean
}

/**
 * The centerpiece of Sprint 21.
 *
 * Renders the student's original handwritten image with an examiner's red-pen
 * marks overlaid on top: stamps in the right margin, underlines under wrong
 * lines, and handwritten margin notes with curved arrows pointing back.
 *
 * Positioning relies on Gemini Vision bounding boxes (percentages of image
 * dimensions). The boxes are approximate — accept ~5-10% drift; the overall
 * effect still communicates which line is being marked.
 *
 * Marks Claude couldn't position (bbox=null) get pushed to a "general
 * feedback" footer beneath the image so we don't fake placement.
 */
export function ExaminerInkOverlay({
  imageUrl,
  lineReferences,
  attemptId,
  photoRef,
  animate = true,
}: ExaminerInkOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const refreshedUrlRef = useRef(false)
  const [displayUrl, setDisplayUrl] = useState(imageUrl)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [revealedCount, setRevealedCount] = useState<number>(
    animate ? 0 : lineReferences.length
  )

  const positioned = useMemo(
    () => lineReferences.filter((l) => l.bbox !== null),
    [lineReferences]
  )
  const unpositioned = useMemo(
    () => lineReferences.filter((l) => l.bbox === null),
    [lineReferences]
  )

  useEffect(() => {
    setDisplayUrl(imageUrl)
    setImageLoaded(false)
    refreshedUrlRef.current = false
  }, [imageUrl])

  async function refreshSignedUrl() {
    if (!attemptId || refreshedUrlRef.current) return
    refreshedUrlRef.current = true
    try {
      const refQuery = photoRef
        ? `&ref=${encodeURIComponent(photoRef)}`
        : ''
      const res = await fetch(
        `/api/media/answer-photo?attempt_id=${encodeURIComponent(attemptId)}${refQuery}`
      )
      if (!res.ok) return
      const data = (await res.json()) as { url?: string }
      if (data.url) {
        setDisplayUrl(data.url)
        setImageLoaded(false)
      }
    } catch {
      // Keep broken state — user can refresh the page
    }
  }

  useEffect(() => {
    if (!animate || !imageLoaded) return
    if (positioned.length === 0) return

    const timer = setInterval(() => {
      setRevealedCount((prev) => {
        if (prev >= positioned.length) {
          clearInterval(timer)
          return prev
        }
        return prev + 1
      })
    }, 650)

    return () => clearInterval(timer)
  }, [animate, imageLoaded, positioned.length])

  const isMarking = animate && revealedCount < positioned.length

  return (
    <div className="space-y-5">
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-2xl border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- we don't know the image dimensions, and next/image's sizing breaks the percentage-based overlay math. */}
        <img
          src={displayUrl}
          alt="Your handwritten answer"
          onLoad={() => setImageLoaded(true)}
          onError={() => void refreshSignedUrl()}
          className="block h-auto w-full"
        />

        <div className="pointer-events-none absolute inset-0">
          <AnimatePresence>
            {positioned.slice(0, revealedCount).map((line, idx) => (
              <ExaminerMark key={`${line.mark_id}-${idx}`} line={line} />
            ))}
          </AnimatePresence>
        </div>

        {isMarking && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--ec-chip-critical-text)] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--ec-chip-critical-text)]" />
            </span>
            Examiner is marking&hellip;
          </motion.div>
        )}

        {animate && !imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--ec-surface-raised)]">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[color-mix(in_srgb,var(--ec-brand)_40%,transparent)] border-t-[var(--ec-brand)]" />
          </div>
        )}
      </div>

      {unpositioned.length > 0 && (
        <UnpositionedNotes notes={unpositioned} />
      )}

      <p className="flex items-center gap-2 text-xs text-[var(--ec-text-secondary)]">
        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        Stamps and notes are drawn from the AI examiner&rsquo;s reasoning.
        Positioning is approximate, but every annotation maps to a real mark
        decision below.
      </p>
    </div>
  )
}

function ExaminerMark({ line }: { line: LineReference }) {
  const { bbox, mark_id, earned, margin_note } = line
  if (!bbox) return null

  // When the line is close to the right edge, flip the stamp to the left margin.
  const flipToLeft = bbox.left + bbox.width > 68
  const stampTop = Math.max(4, Math.min(bbox.top + bbox.height / 2, 96))

  const stampStyle: React.CSSProperties = flipToLeft
    ? {
        left: `${Math.max(2, Math.min(bbox.left - 2, 72))}%`,
        top: `${stampTop}%`,
        transform: 'translate(-100%, -50%)',
      }
    : {
        left: `${Math.min(Math.max(bbox.left + bbox.width + 1, 4), 82)}%`,
        top: `${stampTop}%`,
        transform: 'translateY(-50%)',
      }

  // Clamp bbox to keep underline inside the image when OCR overshoots.
  const safeLeft = Math.max(0, Math.min(bbox.left, 90))
  const safeTop = Math.max(0, Math.min(bbox.top, 92))
  const safeBox = {
    top: safeTop,
    left: safeLeft,
    width: Math.max(2, Math.min(bbox.width, 96 - safeLeft)),
    height: Math.max(2, Math.min(bbox.height, 96 - safeTop)),
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="pointer-events-auto"
    >
      <div
        className="absolute"
        style={{
          top: `${safeBox.top}%`,
          left: `${safeBox.left}%`,
          width: `${safeBox.width}%`,
          height: `${safeBox.height}%`,
        }}
      >
        <UnderlineMark earned={earned} />
        {!earned && margin_note && (
          <MarginNote note={margin_note} flip={flipToLeft} compact />
        )}
      </div>

      <div className="absolute" style={stampStyle}>
        <MarkStamp markId={mark_id} earned={earned} />
      </div>
    </motion.div>
  )
}

function UnpositionedNotes({ notes }: { notes: LineReference[] }) {
  return (
    <div className="ec-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 ec-score-mid" aria-hidden="true" />
        <p className="ec-label-tech">GENERAL FEEDBACK</p>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-[var(--ec-text-secondary)]">
        These marks couldn&rsquo;t be tied to a specific line of working, so
        they&rsquo;re shown together below the page.
      </p>
      <ul className="space-y-3">
        {notes.map((n, i) => {
          const label =
            ERROR_LABELS[n.error_classification as ErrorClassification] ??
            ERROR_LABELS.no_error
          return (
            <li
              key={`${n.mark_id}-unpos-${i}`}
              className="flex items-start gap-3 rounded-2xl border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-3"
            >
              <MarkStamp markId={n.mark_id} earned={n.earned} />
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--ec-text-primary)]">
                  {n.margin_note ||
                    (n.earned ? 'Mark awarded.' : 'Mark not awarded.')}
                </p>
                {!n.earned && (
                  <p
                    className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: label.color }}
                  >
                    {label.label}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
