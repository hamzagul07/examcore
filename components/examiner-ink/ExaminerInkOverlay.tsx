'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { Eye } from 'lucide-react'
import { MathText } from '@/components/MathText'
import { MarginNote } from './MarginNote'
import { MarkStamp } from './MarkStamp'
import { UnderlineMark } from './UnderlineMark'
import {
  ERROR_LABELS,
  type ErrorClassification,
} from '@/lib/error-classifications'

export interface LineReference {
  mark_id: string
  /** Unique per-mark identity for selection (the awarded-mark index). Optional
   * so references persisted before this field existed still type-check — those
   * fall back to code matching in `lineRefKey`. */
  ref_id?: string
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
  /** The selected mark's stable key (its `ref_id`, or a stamp code for legacy
   * data) synced with the mark audit. Not a stamp code in the general case: two
   * marks can share a code, so a code cannot single one out. */
  activeRefId?: string | null
  /** Fired when the student taps a stamp — emits that mark's `lineRefKey`. */
  onActiveMarkChange?: (refKey: string) => void
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
 * The identity used to select a single mark. A stamp code isn't unique — a
 * script can carry two "M1" marks — so selecting by code lit up both and the
 * reveal-sync resolved to whichever came first. New references carry a unique
 * `ref_id`; legacy ones fall back to the code, preserving old behaviour for data
 * that predates the field (a `ref_id` is all digits, a code always has a letter,
 * so the two key spaces never collide).
 */
const lineRefKey = (line: LineReference): string =>
  line.ref_id ?? markCodeKey(line.mark_id)

/**
 * MarkStamp sets its own 20px type (a Tailwind utility, which outranks any
 * layered rule from the design-system CSS), so the stamp is sized here by
 * scaling it: the target is clamp(12px, 4.5% of the image height, 20px), which
 * keeps stamps in proportion on a phone-sized script instead of dwarfing it.
 */
const STAMP_NATURAL_FONT_PX = 20
const stampScaleFor = (imageHeight: number) =>
  Math.min(20, Math.max(12, imageHeight * 0.045)) / STAMP_NATURAL_FONT_PX
/** Height of the stamp's rotated bounding box at scale 1 (measured). */
const STAMP_NATURAL_HEIGHT = 44
/** Half the stamp's natural layout box — how far its centre sits below `top`. */
const STAMP_NATURAL_HALF = 18
const STAMP_GAP = 4

interface StampSlot {
  /** Centre of the stamp, in px from the image top. */
  y: number
  /** Where the line's centre is, in px. Differs from `y` when the stamp was
   * pushed to clear a neighbour, and a leader line then joins the two. */
  lineY: number
  /** Column edge as a percentage of the image width: `left` for stamps in the
   * right margin, `right` for ones flipped to the left. */
  column: number
  scale: number
}

/**
 * Bounding boxes on a real script are often a line-height apart, so stamps
 * centred on each box collide as soon as two consecutive lines earn marks.
 * Instead the stamps are stacked like an examiner's margin column: sorted by
 * line, each one is pushed down until it clears the one above, then the whole
 * column is pulled back up if it ran off the bottom of the page.
 *
 * An anchored stamp stays on its line and the ones above it move up instead:
 * a lost mark's margin note hangs just below its line at the same edge, so a
 * stamp pushed down there would land on the examiner's own handwriting.
 */
function stackStamps(
  desired: number[],
  anchored: boolean[],
  stampHeight: number,
  imageHeight: number
) {
  const step = stampHeight + STAMP_GAP
  const out: number[] = []
  const raiseAbove = (index: number) => {
    let ceiling = out[index] - step
    for (let j = index - 1; j >= 0; j--) {
      out[j] = Math.min(out[j], ceiling)
      ceiling = out[j] - step
    }
  }
  let floor = -Infinity
  desired.forEach((d, i) => {
    if (anchored[i] && d < floor) {
      out.push(d)
      raiseAbove(i)
    } else {
      out.push(Math.max(d, floor))
    }
    floor = out[i] + step
  })
  out.push(imageHeight - stampHeight / 2 + step)
  raiseAbove(out.length - 1)
  out.pop()
  return out
}

/** Lines whose box reaches the right edge carry their stamp on the left. */
const flipsToLeft = (bbox: NonNullable<LineReference['bbox']>) =>
  bbox.left + bbox.width > 75

function layoutStamps(
  positioned: LineReference[],
  imageHeight: number,
  mobile: boolean
): Map<number, StampSlot> {
  const slots = new Map<number, StampSlot>()
  if (imageHeight <= 0) return slots
  const scale = stampScaleFor(imageHeight)
  const stampHeight = STAMP_NATURAL_HEIGHT * scale

  const right: number[] = []
  const left: number[] = []
  positioned.forEach((line, i) => {
    if (!line.bbox) return
    ;(flipsToLeft(line.bbox) ? left : right).push(i)
  })
  const centreOf = (i: number) => {
    const bbox = positioned[i].bbox!
    return ((bbox.top + bbox.height / 2) / 100) * imageHeight
  }
  const hasNote = (i: number) =>
    !positioned[i].earned && Boolean(positioned[i].margin_note)

  // One column per side, sitting just past the longest line on that side so no
  // stamp lands on top of handwriting.
  if (right.length > 0) {
    right.sort((a, b) => centreOf(a) - centreOf(b))
    const end = Math.max(
      ...right.map((i) => positioned[i].bbox!.left + positioned[i].bbox!.width)
    )
    const column = Math.min(end + 1.5, mobile ? 82 : 88)
    const ys = stackStamps(
      right.map(centreOf),
      right.map(hasNote),
      stampHeight,
      imageHeight
    )
    right.forEach((i, n) =>
      slots.set(i, { y: ys[n], lineY: centreOf(i), column, scale })
    )
  }
  if (left.length > 0) {
    left.sort((a, b) => centreOf(a) - centreOf(b))
    const start = Math.min(...left.map((i) => positioned[i].bbox!.left))
    const column = Math.max(100 - start + 1.5, mobile ? 12 : 8)
    const ys = stackStamps(
      left.map(centreOf),
      left.map(hasNote),
      stampHeight,
      imageHeight
    )
    left.forEach((i, n) =>
      slots.set(i, { y: ys[n], lineY: centreOf(i), column, scale })
    )
  }
  return slots
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
  activeRefId = null,
  onActiveMarkChange,
  ghostFixes = {},
}: ExaminerInkOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const refreshedUrlRef = useRef(false)
  const [displayUrl, setDisplayUrl] = useState(imageUrl)
  const [imageLoaded, setImageLoaded] = useState(false)

  const [isMobileInk, setIsMobileInk] = useState(false)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
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

  // Stamp layout works in pixels of the rendered image, so track its size —
  // it changes with the viewport and again when a refreshed URL loads.
  useEffect(() => {
    const img = imgRef.current
    if (!img) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setImageSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height }
      )
    })
    observer.observe(img)
    return () => observer.disconnect()
  }, [displayUrl])

  const stampSlots = useMemo(
    () => layoutStamps(positioned, imageSize.height, isMobileInk),
    [positioned, imageSize.height, isMobileInk]
  )

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
    if (!activeRefId) return
    const idx = positioned.findIndex((line) => lineRefKey(line) === activeRefId)
    if (idx >= 0) {
      setRevealedCount((prev) => Math.max(prev, idx + 1))
    }
  }, [activeRefId, positioned])

  const isMarking = animate && revealedCount < positioned.length

  // Only fade the other stamps when the selected mark is actually on THIS page.
  // Each page overlay gets the same activeRefId, so without this, selecting a
  // mark that lives on another page — or an unpositioned "general feedback" mark
  // that isn't drawn at all — would dim every stamp here and highlight none.
  const activeOnThisPage =
    activeRefId != null &&
    positioned.some((line) => lineRefKey(line) === activeRefId)

  return (
    // reducedMotion="user": every stamp/margin-note/underline spring under
    // this overlay collapses to its final state for prefers-reduced-motion
    // readers — none of the ink components check the setting themselves.
    <MotionConfig reducedMotion="user">
    <div className="space-y-5">
      <div
        ref={containerRef}
        className="examiner-ink-overlay relative w-full overflow-hidden rounded border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface-raised))]"
        style={{ boxShadow: 'var(--ec-shadow-hard, 6px 6px 0 rgba(0, 0, 0, 0.12))' }}
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
            {positioned.slice(0, revealedCount).map((line, idx) => {
              const key = lineRefKey(line)
              return (
                <ExaminerMark
                  key={`${key}-${idx}`}
                  line={line}
                  ghostFix={
                    !line.earned ? ghostFixes[markCodeKey(line.mark_id)] : undefined
                  }
                  mobileLayout={isMobileInk}
                  slot={stampSlots.get(idx)}
                  imageSize={imageSize}
                  active={activeOnThisPage && key === activeRefId}
                  dimmed={activeOnThisPage && key !== activeRefId}
                  onSelect={
                    onActiveMarkChange
                      ? () => onActiveMarkChange(key)
                      : undefined
                  }
                />
              )
            })}
          </AnimatePresence>
        </div>

        {isMarking && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute right-3 top-3 flex items-center gap-2 rounded border border-[var(--ec-border)] bg-[color-mix(in_srgb,var(--ec-paper,var(--ec-surface))_94%,transparent)] px-3 py-1.5 font-mono text-[11px] font-semibold tracking-wide text-[var(--ec-text-primary)]"
          >
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex h-2 w-2 rounded-[2px] bg-[var(--ec-chip-critical-text)]" />
            </span>
            Examiner is marking&hellip;
          </motion.div>
        )}

        {animate && !imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--ec-surface-raised)]">
            <div className="h-10 w-10 animate-spin rounded border-2 border-[color-mix(in_srgb,var(--ec-brand)_40%,transparent)] border-t-[var(--ec-brand)]" />
          </div>
        )}
      </div>

      {unpositioned.length > 0 && (
        <UnpositionedNotes notes={unpositioned} />
      )}

      <p className="flex items-center gap-2 text-xs text-[var(--ec-text-secondary)]">
        <Eye className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
        Stamps and notes are drawn from the AI examiner&rsquo;s reasoning.
        Positioning is approximate, but every annotation maps to a real mark
        decision below.
      </p>
    </div>
    </MotionConfig>
  )
}

function ExaminerMark({
  line,
  ghostFix,
  mobileLayout = false,
  slot,
  imageSize,
  active = false,
  dimmed = false,
  onSelect,
}: {
  line: LineReference
  ghostFix?: { text: string; earns: string }
  mobileLayout?: boolean
  /** Column position from `layoutStamps`; absent until the image is measured. */
  slot?: StampSlot
  imageSize: { width: number; height: number }
  active?: boolean
  dimmed?: boolean
  onSelect?: () => void
}) {
  const { bbox, mark_id, earned, margin_note } = line
  if (!bbox) return null

  // When the line is close to the right edge, flip the stamp/note to the
  // left side so they don't shoot off the image.
  const flipToLeft = flipsToLeft(bbox)
  const activeBoost = active ? 1.12 : 1
  let stampStyle: React.CSSProperties
  if (slot) {
    // Scale from the top corner nearest the column edge so the stamp's layout
    // box and its visual box share `top` — that is what stackStamps measured.
    const top = slot.y - STAMP_NATURAL_HALF * slot.scale
    stampStyle = flipToLeft
      ? {
          right: `${slot.column}%`,
          top,
          transform: `scale(${slot.scale * activeBoost})`,
          transformOrigin: 'top right',
        }
      : {
          left: `${slot.column}%`,
          top,
          transform: `scale(${slot.scale * activeBoost})`,
          transformOrigin: 'top left',
        }
  } else {
    // Before the image has a size: centre on the line, as the sheet renders
    // server-side and the measured column takes over on the first resize tick.
    const stampLeft = Math.min(bbox.left + bbox.width + 1, mobileLayout ? 82 : 88)
    const stampRight = Math.max(100 - bbox.left + 1, mobileLayout ? 12 : 8)
    const stampScale = (mobileLayout ? 0.85 : 1) * activeBoost
    stampStyle = {
      ...(flipToLeft ? { right: `${stampRight}%` } : { left: `${stampLeft}%` }),
      top: `${bbox.top + bbox.height / 2}%`,
      transform: `translateY(-50%) scale(${stampScale})`,
    }
  }

  // A stamp pushed off its line gets a leader stroke back to the box it marks,
  // from the box's edge nearest the margin to the stamp's near edge. A nudge
  // that keeps the stamp's centre within the line's own band needs none.
  const displaced = slot
    ? Math.abs(slot.y - slot.lineY) >
      ((bbox.height / 100) * imageSize.height) / 2 + 4
    : false
  const leader =
    slot && displaced && imageSize.width > 0
      ? (() => {
          const boxEdge = flipToLeft
            ? (bbox.left / 100) * imageSize.width - 3
            : ((bbox.left + bbox.width) / 100) * imageSize.width + 3
          const stampEdge = flipToLeft
            ? imageSize.width - (slot.column / 100) * imageSize.width + 2
            : (slot.column / 100) * imageSize.width - 2
          return { x1: boxEdge, y1: slot.lineY, x2: stampEdge, y2: slot.y }
        })()
      : null
  const inkColor = earned ? 'var(--ec-brand)' : 'var(--ec-ink-crimson)'

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
          outline: active
            ? '1.5px solid color-mix(in srgb, var(--ec-brand) 70%, transparent)'
            : undefined,
          outlineOffset: active ? 2 : undefined,
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
            className="flex items-center gap-2 rounded border border-dashed px-2.5 py-1.5 text-[11px] leading-snug shadow-[var(--ec-shadow-hard,2px_2px_0_rgba(0,0,0,0.06))]"
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
            <span className="min-w-0">
              <MathText text={ghostFix.text} />
            </span>
            <span
              className="whitespace-nowrap font-mono font-bold"
              style={{ color: 'var(--ec-chip-warning-text)' }}
            >
              {ghostFix.earns}
            </span>
          </div>
        </motion.div>
      )}

      {leader && (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <motion.line
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.7 }}
            transition={{ delay: 0.25, duration: 0.3, ease: 'easeOut' }}
            x1={leader.x1}
            y1={leader.y1}
            x2={leader.x2}
            y2={leader.y2}
            stroke={inkColor}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
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
    <div className="ec-card ec-card--paper p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-grid h-5 min-w-5 place-items-center rounded border border-[color-mix(in_srgb,var(--ec-chip-warning-text)_40%,transparent)] bg-[color-mix(in_srgb,var(--ec-chip-warning-text)_12%,transparent)] px-1 font-mono text-[10px] font-bold tracking-wide ec-score-mid" aria-hidden>!</span>
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
              className="ec-card ec-card--paper flex items-start gap-3 border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface-raised))] p-3"
            >
              <MarkStamp markId={n.mark_id} earned={n.earned} />
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--ec-text-primary)]">
                  {n.margin_note ? (
                    <MathText text={n.margin_note} />
                  ) : n.earned ? (
                    'Mark awarded.'
                  ) : (
                    'Mark not awarded.'
                  )}
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
