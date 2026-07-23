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
  /** Stamp code (B1, M1…) synced with mark audit selection. */
  activeMarkId?: string | null
  /** Fired when the student taps a stamp on the script. */
  onActiveMarkChange?: (markId: string) => void
  /**
   * Inline ghost insertions for missed marks, keyed by mark code (A1, B1).
   * When a missed mark resolves to a line on the script, its fix is drawn as a
   * dashed insertion beneath that line — the mark made visible where it belonged.
   * Marks that don't resolve to a line are left to the Mark Gap panel.
   */
  ghostFixes?: Record<string, { text: string; earns: string }>
}

/** Uppercased alphanumerics only, so "A1", "a1.", "(A1)" all key the same. */
const markCodeKey = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '')

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
  activeMarkId = null,
  onActiveMarkChange,
  ghostFixes = {},
}: ExaminerInkOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const refreshedUrlRef = useRef(false)
  const [displayUrl, setDisplayUrl] = useState(imageUrl)
  const [imageLoaded, setImageLoaded] = useState(false)

  const [isMobileInk, setIsMobileInk] = useState(false)
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

  /**
   * Don't rely on React's `onLoad` alone.
   *
   * When the markup is server-rendered, the browser can finish fetching the
   * image before React hydrates and attaches its synthetic handler — the load
   * event is then gone for good, `imageLoaded` stays false, and the spinner
   * covers a perfectly loaded script forever while the marks (gated on the same
   * flag) never animate. Reproduced on the landing showcase: `img.complete` was
   * true and `naturalWidth` 1100 while React still believed it was loading.
   *
   * So: check `complete` when the node attaches, and otherwise listen natively,
   * which is immune to hydration timing.
   */
  useEffect(() => {
    const img = imgRef.current
    if (!img) return
    if (img.complete && img.naturalWidth > 0) {
      setImageLoaded(true)
      return
    }
    const onLoad = () => setImageLoaded(true)
    img.addEventListener('load', onLoad)
    return () => img.removeEventListener('load', onLoad)
  }, [displayUrl])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const update = () => setIsMobileInk(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

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

  useEffect(() => {
    if (!activeMarkId) return
    const idx = positioned.findIndex(
      (line) => line.mark_id.toUpperCase() === activeMarkId.toUpperCase()
    )
    if (idx >= 0) {
      setRevealedCount((prev) => Math.max(prev, idx + 1))
    }
  }, [activeMarkId, positioned])

  const isMarking = animate && revealedCount < positioned.length

  return (
    <div className="space-y-5">
      <div
        ref={containerRef}
        className="examiner-ink-overlay relative w-full overflow-hidden rounded-2xl border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] shadow-[var(--ec-shadow-elevation-2)]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- we don't know the image dimensions, and next/image's sizing breaks the percentage-based overlay math. */}
        <img
          ref={imgRef}
          src={displayUrl}
          alt="Your handwritten answer"
          onLoad={() => setImageLoaded(true)}
          onError={() => void refreshSignedUrl()}
          className="block h-auto w-full"
        />

        <div className="pointer-events-none absolute inset-0">
          <AnimatePresence>
            {positioned.slice(0, revealedCount).map((line, idx) => (
              <ExaminerMark
                key={`${line.mark_id}-${idx}`}
                line={line}
                ghostFix={
                  !line.earned ? ghostFixes[markCodeKey(line.mark_id)] : undefined
                }
                mobileLayout={isMobileInk}
                active={
                  activeMarkId
                    ? line.mark_id.toUpperCase() === activeMarkId.toUpperCase()
                    : false
                }
                dimmed={
                  !!activeMarkId &&
                  line.mark_id.toUpperCase() !== activeMarkId.toUpperCase()
                }
                onSelect={
                  onActiveMarkChange
                    ? () => onActiveMarkChange(line.mark_id)
                    : undefined
                }
              />
            ))}
          </AnimatePresence>
        </div>

        {isMarking && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute right-3 top-3 flex items-center gap-2 rounded-full border border-[var(--ec-border)] bg-[color-mix(in_srgb,var(--ec-surface)_92%,transparent)] px-3 py-1.5 text-xs font-semibold text-[var(--ec-text-primary)] backdrop-blur-sm"
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

function ExaminerMark({
  line,
  ghostFix,
  mobileLayout = false,
  active = false,
  dimmed = false,
  onSelect,
}: {
  line: LineReference
  ghostFix?: { text: string; earns: string }
  mobileLayout?: boolean
  active?: boolean
  dimmed?: boolean
  onSelect?: () => void
}) {
  const { bbox, mark_id, earned, margin_note } = line
  if (!bbox) return null

  // When the line is close to the right edge, flip the stamp/note to the
  // left side so they don't shoot off the image.
  const flipToLeft = bbox.left + bbox.width > 75
  const stampLeft = Math.min(bbox.left + bbox.width + 1, mobileLayout ? 82 : 88)
  const stampRight = Math.max(100 - bbox.left + 1, mobileLayout ? 12 : 8)
  const stampScale = active ? (mobileLayout ? 0.95 : 1.12) : mobileLayout ? 0.85 : 1
  const stampStyle: React.CSSProperties = flipToLeft
    ? {
        right: `${stampRight}%`,
        top: `${bbox.top + bbox.height / 2}%`,
        transform: `translateY(-50%) scale(${stampScale})`,
      }
    : {
        left: `${stampLeft}%`,
        top: `${bbox.top + bbox.height / 2}%`,
        transform: `translateY(-50%) scale(${stampScale})`,
      }

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
      animate={{ opacity: dimmed ? 0.35 : 1 }}
      transition={{ duration: 0.2 }}
      className={onSelect ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}
      onClick={
        onSelect
          ? (e) => {
              e.stopPropagation()
              onSelect()
            }
          : undefined
      }
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect()
              }
            }
          : undefined
      }
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-label={onSelect ? `Highlight ${mark_id} on script` : undefined}
    >
      <div
        className="absolute transition-[filter] duration-200"
        style={{
          top: `${safeBox.top}%`,
          left: `${safeBox.left}%`,
          width: `${safeBox.width}%`,
          height: `${safeBox.height}%`,
          filter: active ? 'drop-shadow(0 0 6px color-mix(in srgb, var(--ec-brand) 55%, transparent))' : undefined,
        }}
      >
        <UnderlineMark earned={earned} />
        {!earned && margin_note && (
          <MarginNote
            note={margin_note}
            flip={flipToLeft}
            layout={mobileLayout ? 'below' : 'side'}
          />
        )}
      </div>

      {!earned && ghostFix && (
        <motion.div
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: dimmed ? 0.35 : 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
          className="absolute"
          style={{
            top: `${Math.min(safeBox.top + safeBox.height + 1.2, 95)}%`,
            left: `${safeBox.left}%`,
            maxWidth: `${Math.max(42, 96 - safeBox.left)}%`,
          }}
        >
          {/* Fixed paper white + dark ink: this sits on the photo, which is
              light in every theme (see MarkStamp). */}
          <div
            className="flex items-center gap-2 rounded-lg border border-dashed px-2.5 py-1.5 text-[11px] leading-snug shadow-sm"
            style={{
              borderColor: 'var(--ec-chip-warning-text)',
              background: 'rgba(252, 251, 247, 0.94)',
              color: '#26221b',
            }}
          >
            <span
              className="font-mono font-bold"
              style={{ color: 'var(--ec-chip-warning-text)' }}
              aria-hidden="true"
            >
              &#8629;
            </span>
            <span className="min-w-0">{ghostFix.text}</span>
            <span
              className="whitespace-nowrap font-mono font-bold"
              style={{ color: 'var(--ec-chip-warning-text)' }}
            >
              {ghostFix.earns}
            </span>
          </div>
        </motion.div>
      )}

      <div
        className="absolute transition-transform duration-200"
        style={stampStyle}
      >
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
