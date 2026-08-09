import type { Highlight, HighlightKind } from '@/lib/courses/highlights'
import { HIGHLIGHT_KINDS, spansFor } from '@/lib/courses/highlights'

/**
 * Painting highlights onto the page.
 *
 * This uses the CSS Custom Highlight API rather than wrapping text in <mark>
 * elements, and that choice is the whole design. Wrapping means mutating DOM
 * that React owns: the moment React re-renders a section — changing study
 * stage, toggling plain-English mode — it tries to reconcile against children
 * it never created, and you get either lost highlights or a hard crash out of
 * removeChild. Ranges live outside the DOM entirely, so there is nothing for
 * React to trip over and no markup difference for crawlers to see.
 *
 * The cost is browser support, so the feature detects and simply does not offer
 * itself where it is unavailable. A missing highlighter is a fine outcome; a
 * lesson that crashes when you change stage is not.
 */

type HighlightRegistry = Map<string, unknown> & {
  set(name: string, value: unknown): HighlightRegistry
  delete(name: string): boolean
}

type CSSWithHighlights = {
  highlights?: HighlightRegistry
}

declare const Highlight: {
  new (...ranges: Range[]): unknown
}

/** Registry name per kind. Namespaced — the registry is global to the page. */
export function registryName(kind: HighlightKind): string {
  return `ms-hl-${kind}`
}

export function supportsHighlightApi(): boolean {
  if (typeof window === 'undefined') return false
  const css = (window as unknown as { CSS?: CSSWithHighlights }).CSS
  return (
    !!css?.highlights &&
    typeof (window as unknown as { Highlight?: unknown }).Highlight === 'function' &&
    typeof document.createRange === 'function'
  )
}

const HIGHLIGHT_STYLE_ID = 'ms-highlight-api-styles'

/**
 * Install ::highlight() paint rules outside the PostCSS pipeline.
 * Bundlers in this repo reject `::highlight` as an unknown pseudo-element.
 */
export function ensureHighlightStyles(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(HIGHLIGHT_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = HIGHLIGHT_STYLE_ID
  style.textContent = `
::highlight(ms-hl-key) {
  background-color: var(--hl-key-bg);
  text-decoration-color: var(--hl-key);
}
::highlight(ms-hl-unclear) {
  background-color: color-mix(in srgb, var(--hl-unclear) 32%, transparent);
  text-decoration: underline wavy var(--hl-unclear);
  text-underline-offset: 4px;
}
::highlight(ms-hl-exam) {
  background-color: color-mix(in srgb, var(--hl-exam) 30%, transparent);
}
`.trim()
  document.head.appendChild(style)
}

/**
 * Text nodes of a section, in order, with running character offsets.
 *
 * Skips anything interactive or generated. Offsets are only stable if the same
 * skip rules apply when reading a selection and when painting it back, so both
 * directions go through this one function — a highlight that lands on different
 * words after a reload is worse than no highlight at all.
 */
const SKIP_SELECTOR =
  'button, input, textarea, select, svg, script, style, .katex, .katex-display, [data-no-highlight], .feature-hint, .study-rail, .qc-progress, .lesson-hl-recap'

export type TextBit = { node: Text; start: number; end: number }

export function textBits(container: Element): TextBit[] {
  const out: TextBit[] = []
  let at = 0
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = (node as Text).parentElement
      if (!parent) return NodeFilter.FILTER_REJECT
      if (parent.closest(SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT
      // Whitespace between blocks is not text anybody selected.
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })
  let n = walker.nextNode()
  while (n) {
    const len = n.nodeValue?.length ?? 0
    out.push({ node: n as Text, start: at, end: at + len })
    at += len
    n = walker.nextNode()
  }
  return out
}

export function textLength(bits: readonly TextBit[]): number {
  return bits.length ? bits[bits.length - 1]!.end : 0
}

/** Character offsets of a DOM range within a section, or null if unusable. */
export function offsetsFromRange(
  bits: readonly TextBit[],
  range: Range
): { start: number; end: number; text: string } | null {
  let start = -1
  let end = -1
  for (const bit of bits) {
    if (bit.node === range.startContainer) start = bit.start + range.startOffset
    if (bit.node === range.endContainer) end = bit.start + range.endOffset
  }
  // A selection can begin or end in a skipped node (or outside the section);
  // clamp to what we can see rather than throwing the whole thing away.
  if (start < 0 && end < 0) return null
  if (start < 0) start = 0
  if (end < 0) end = textLength(bits)
  if (end <= start) return null
  return { start, end, text: range.toString().trim() }
}

/**
 * The character offset of a single caret position.
 *
 * Separate from offsetsFromRange because that one rejects empty ranges — a
 * highlight needs two distinct ends. A click is a collapsed range, so asking
 * "what is under the cursor" through the range version always answered null
 * and clicking a highlight to remove it could never work.
 */
export function offsetOf(
  bits: readonly TextBit[],
  node: Node,
  offset: number
): number | null {
  for (const bit of bits) {
    if (bit.node === node) return bit.start + offset
  }
  return null
}

/** A DOM range for character offsets, or null if the text has since changed. */
export function rangeFromOffsets(
  bits: readonly TextBit[],
  start: number,
  end: number
): Range | null {
  let startBit: TextBit | undefined
  let endBit: TextBit | undefined
  for (const bit of bits) {
    if (!startBit && start >= bit.start && start < bit.end) startBit = bit
    if (end > bit.start && end <= bit.end) endBit = bit
  }
  if (!startBit || !endBit) return null
  try {
    const r = document.createRange()
    r.setStart(startBit.node, start - startBit.start)
    r.setEnd(endBit.node, end - endBit.start)
    return r
  } catch {
    return null
  }
}

/**
 * Repaint every highlight for the page.
 *
 * Cheap enough to do wholesale on any change: building ranges is a walk over
 * text nodes, and getting it wrong incrementally — a stale range surviving a
 * stage change — is the failure that looks like corruption.
 */
export function paint(root: ParentNode, list: readonly Highlight[]): void {
  if (!supportsHighlightApi()) return
  ensureHighlightStyles()
  const css = (window as unknown as { CSS: CSSWithHighlights }).CSS
  const registry = css.highlights
  if (!registry) return

  const bySection = new Map<string, Element>()
  for (const el of root.querySelectorAll('section.lsec')) {
    if (el.id) bySection.set(el.id, el)
  }

  const ranges = new Map<HighlightKind, Range[]>()
  for (const kind of HIGHLIGHT_KINDS) ranges.set(kind, [])

  for (const [sectionId, el] of bySection) {
    const inSection = list.filter((h) => h.section === sectionId)
    if (!inSection.length) continue
    const bits = textBits(el)
    const len = textLength(bits)
    for (const span of spansFor(inSection, sectionId, len)) {
      if (!span.kind) continue
      const r = rangeFromOffsets(bits, span.start, span.end)
      if (r) ranges.get(span.kind)!.push(r)
    }
  }

  for (const kind of HIGHLIGHT_KINDS) {
    const rs = ranges.get(kind)!
    const name = registryName(kind)
    if (!rs.length) registry.delete(name)
    else registry.set(name, new Highlight(...rs))
  }
}

/** Drop every painted highlight — used when the component unmounts. */
export function clearPaint(): void {
  if (!supportsHighlightApi()) return
  const registry = (window as unknown as { CSS: CSSWithHighlights }).CSS.highlights
  if (!registry) return
  for (const kind of HIGHLIGHT_KINDS) registry.delete(registryName(kind))
}

/** The section a selection sits in, if it sits cleanly in one. */
export function sectionOf(range: Range): Element | null {
  const node =
    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? (range.commonAncestorContainer as Element)
      : range.commonAncestorContainer.parentElement
  return node?.closest('section.lsec') ?? null
}
