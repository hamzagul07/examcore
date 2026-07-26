'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  HIGHLIGHT_KINDS,
  HIGHLIGHT_META,
  addHighlight,
  highlightAt,
  parse,
  removeHighlight,
  serialize,
  storageKey,
  type Highlight,
  type HighlightKind,
} from '@/lib/courses/highlights'
import {
  offsetsFromRange,
  offsetOf,
  paint,
  clearPaint,
  sectionOf,
  supportsHighlightApi,
  textBits,
} from '@/lib/courses/highlight-dom'

/**
 * Select text in a lesson, mark it, and have it still be there next week.
 *
 * The toolbar appears at the selection rather than in a fixed corner, because a
 * highlighter you have to go and find is one nobody uses. It is keyboard
 * reachable for the same reason the rest of the lesson is.
 */

type Anchor = { x: number; y: number; below: boolean }

/** Roughly the toolbar's height plus its gap — enough to know if it would go
 *  off the top of the screen and should flip underneath the selection. */
const BAR_CLEARANCE = 56

/**
 * Keep the toolbar on screen.
 *
 * A selection in the first line or two of the viewport would otherwise put the
 * toolbar above the top edge, where it cannot be clicked at all; one at the far
 * left or right would hang off the side. Flipping below and clamping the
 * horizontal centre costs nothing and removes both dead zones.
 */
function anchorFor(rect: DOMRect): Anchor {
  const below = rect.top < BAR_CLEARANCE
  const margin = 96
  const x = Math.min(
    Math.max(rect.left + rect.width / 2, margin),
    window.innerWidth - margin
  )
  return { x, y: below ? rect.bottom : rect.top, below }
}

export function useHighlights(lessonSlug: string, rootRef: React.RefObject<HTMLElement | null>) {
  const [list, setList] = useState<Highlight[]>([])
  const [supported, setSupported] = useState(false)
  // State, deliberately, not a ref.
  //
  // A ref set at the end of the load effect is already true when the save
  // effect runs in that same commit, while `list` is still the empty initial
  // value — so the first thing the page did was overwrite your saved
  // highlights with nothing. They survived until you reloaded, which is the
  // worst possible way for this to fail. As state it flips in the same batch
  // as the loaded list, so the save effect never sees one without the other.
  const [loaded, setLoaded] = useState(false)

  // Read once, on the client. Not lazy useState initial state: this renders the
  // recap, and reading localStorage during the first render would disagree with
  // the server-rendered HTML.
  useEffect(() => {
    setSupported(supportsHighlightApi())
    try {
      setList(parse(window.localStorage.getItem(storageKey(lessonSlug))))
    } catch {
      /* private mode: highlights just do not persist */
    }
    setLoaded(true)
    return () => clearPaint()
  }, [lessonSlug])

  useEffect(() => {
    if (!loaded) return
    try {
      window.localStorage.setItem(storageKey(lessonSlug), serialize(list))
    } catch {
      /* ignore */
    }
  }, [lessonSlug, list, loaded])

  const repaint = useCallback(() => {
    const root = rootRef.current
    if (root) paint(root, list)
  }, [list, rootRef])

  return { list, setList, supported, repaint }
}

export function Highlighter({
  list,
  setList,
  supported,
  repaint,
  rootRef,
  /** Changes that reflow the article, so painted ranges are rebuilt. */
  repaintKey,
}: {
  list: Highlight[]
  setList: React.Dispatch<React.SetStateAction<Highlight[]>>
  supported: boolean
  repaint: () => void
  rootRef: React.RefObject<HTMLElement | null>
  repaintKey: string
}) {
  const [anchor, setAnchor] = useState<Anchor | null>(null)
  const [existing, setExisting] = useState<Highlight | null>(null)
  const pending = useRef<{ section: string; start: number; end: number; text: string } | null>(null)

  // Repaint after the article has settled. Ranges are rebuilt from offsets
  // rather than kept around, so a stage change or a re-render cannot leave a
  // highlight pointing at text that has moved.
  useEffect(() => {
    if (!supported) return
    const t = window.setTimeout(repaint, 0)
    return () => window.clearTimeout(t)
  }, [repaint, repaintKey, supported])

  const close = useCallback(() => {
    setAnchor(null)
    setExisting(null)
    pending.current = null
  }, [])

  useEffect(() => {
    if (!supported) return

    const onUp = () => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        // A plain click inside an existing highlight offers to remove it.
        const r = sel && sel.rangeCount ? sel.getRangeAt(0) : null
        if (!r) return close()
        const section = sectionOf(r)
        if (!section?.id) return close()
        const caret = offsetOf(textBits(section), r.startContainer, r.startOffset)
        const found = caret === null ? null : highlightAt(list, section.id, caret)
        if (!found) return close()
        setExisting(found)
        setAnchor(anchorFor(r.getBoundingClientRect()))
        return
      }

      const range = sel.getRangeAt(0)
      const section = sectionOf(range)
      // Selections that span sections, or land outside the prose, are ignored
      // rather than clamped to something the reader did not mean.
      if (!section?.id || !rootRef.current?.contains(section)) return close()

      const hit = offsetsFromRange(textBits(section), range)
      if (!hit || !hit.text) return close()

      const rect = range.getBoundingClientRect()
      if (!rect.width && !rect.height) return close()
      pending.current = { section: section.id, ...hit }
      setExisting(null)
      setAnchor(anchorFor(rect))
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }

    // Follow the selection rather than dismissing on scroll.
    //
    // Closing on any scroll meant a nudge of the wheel — or the tail of a
    // smooth scroll that had not finished — took the toolbar away mid-choice,
    // and on a phone the small scroll that often accompanies a drag-select was
    // enough to lose it. Recomputing from the live selection keeps it attached
    // to the words, and it still goes away once the selection does.
    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const sel = window.getSelection()
        if (!sel || sel.rangeCount === 0) return close()
        const r = sel.getRangeAt(0)
        const rect = r.getBoundingClientRect()
        if (!rect.width && !rect.height) return close()
        setAnchor(anchorFor(rect))
      })
    }

    document.addEventListener('mouseup', onUp)
    document.addEventListener('keyup', onUp)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('keyup', onUp)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [close, list, rootRef, supported])

  const apply = useCallback(
    (kind: HighlightKind) => {
      const p = pending.current
      if (!p) return
      const id = `${p.section}-${p.start}-${p.end}-${kind}`
      setList((prev) => addHighlight(prev, { ...p, kind }, id))
      window.getSelection()?.removeAllRanges()
      close()
    },
    [close, setList]
  )

  const drop = useCallback(() => {
    if (!existing) return
    setList((prev) => removeHighlight(prev, existing.id))
    window.getSelection()?.removeAllRanges()
    close()
  }, [close, existing, setList])

  if (!supported || !anchor) return null

  return (
    <div
      className={`hl-bar${anchor.below ? ' below' : ''}`}
      role="toolbar"
      aria-label="Highlight selection"
      style={{ left: anchor.x, top: anchor.y }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {existing ? (
        <button type="button" className="hl-btn hl-remove" onClick={drop}>
          Remove highlight
        </button>
      ) : (
        HIGHLIGHT_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            className={`hl-btn hl-${k}`}
            onClick={() => apply(k)}
            title={HIGHLIGHT_META[k].hint}
          >
            <span className="hl-swatch" aria-hidden />
            {HIGHLIGHT_META[k].label}
          </button>
        ))
      )}
    </div>
  )
}
