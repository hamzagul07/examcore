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
  animate = true,
}: ExaminerInkOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
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
        className="relative inline-block w-full overflow-visible rounded-2xl border border-white/10 bg-dark-900/40 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)] sm:overflow-hidden"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- we don't know the image dimensions, and next/image's sizing breaks the percentage-based overlay math. */}
        <img
          src={imageUrl}
          alt="Your handwritten answer"
          onLoad={() => setImageLoaded(true)}
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
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            Examiner is marking&hellip;
          </motion.div>
        )}

        {animate && !imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-900/40">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/40 border-t-emerald-400" />
          </div>
        )}
      </div>

      {unpositioned.length > 0 && (
        <UnpositionedNotes notes={unpositioned} />
      )}

      <p className="flex items-center gap-2 text-xs text-slate-500">
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

  // When the line is close to the right edge, flip the stamp/note to the
  // left side so they don't shoot off the image.
  const flipToLeft = bbox.left + bbox.width > 75
  const stampStyle: React.CSSProperties = flipToLeft
    ? { right: `${100 - bbox.left + 1}%`, top: `${bbox.top + bbox.height / 2}%`, transform: 'translateY(-50%)' }
    : { left: `${Math.min(bbox.left + bbox.width + 1, 92)}%`, top: `${bbox.top + bbox.height / 2}%`, transform: 'translateY(-50%)' }

  // Clamp bbox to keep underline inside the image when OCR overshoots.
  const safeBox = {
    top: Math.max(0, Math.min(bbox.top, 98)),
    left: Math.max(0, Math.min(bbox.left, 95)),
    width: Math.max(2, Math.min(bbox.width, 100 - bbox.left)),
    height: Math.max(2, Math.min(bbox.height, 100 - bbox.top)),
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
        {!earned && margin_note && <MarginNote note={margin_note} flip={flipToLeft} />}
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
        <AlertCircle className="h-4 w-4 text-amber-400" aria-hidden="true" />
        <p className="ec-label-tech">GENERAL FEEDBACK</p>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-slate-400">
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
              className="flex items-start gap-3 rounded-2xl border border-white/5 bg-dark-900/60 p-3"
            >
              <MarkStamp markId={n.mark_id} earned={n.earned} />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-200">
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
