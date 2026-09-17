/**
 * Keyboard scrolling for Study Mode.
 *
 * Study mode turns .lesson-page into a fixed, self-scrolling overlay and locks
 * the document, so the arrow keys have to move the OVERLAY. Browsers do that
 * natively only when focus sits inside it — and even then WebKit drops rapid
 * taps and rebounds after key-up, and focus quietly falls to <body> whenever
 * the focused element unmounts (a "reveal" button, a closed dialog), where
 * each engine then does something different. So the page handles the scroll
 * keys itself. Everything here is pure so it can be tested without a DOM.
 *
 * Precedence, highest first:
 *   1. Nothing while a modal dialog is open — the dialog owns the keyboard.
 *   2. Nothing on an editable or key-owning control (inputs, textareas,
 *      selects, contenteditable, textbox/slider/radiogroup roles, the
 *      quick-check list with its roving-tabindex arrows). They keep their
 *      native or widget behaviour: the caret moves, the next card focuses.
 *   3. Nothing with Ctrl/Meta/Alt held — those are browser shortcuts.
 *   4. Otherwise a scroll key scrolls the pane.
 */

export type StudyScrollIntent =
  | { kind: 'line' | 'page'; dir: -1 | 1 }
  | { kind: 'edge'; dir: -1 | 1 }

type KeyLike = {
  key: string
  shiftKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
}

/** Native arrow step in Chromium and WebKit; Firefox uses three text lines. */
export const LINE_STEP = 40
/** Same fraction of the viewport every engine keeps as overlap on a page scroll. */
const PAGE_FRACTION = 0.875

/** What a key press asks for, or null when it is not a scroll key for us. */
export function studyScrollIntent(e: KeyLike): StudyScrollIntent | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null
  switch (e.key) {
    case 'ArrowDown':
      return e.shiftKey ? null : { kind: 'line', dir: 1 }
    case 'ArrowUp':
      return e.shiftKey ? null : { kind: 'line', dir: -1 }
    case 'PageDown':
      return e.shiftKey ? null : { kind: 'page', dir: 1 }
    case 'PageUp':
      return e.shiftKey ? null : { kind: 'page', dir: -1 }
    case 'End':
      return e.shiftKey ? null : { kind: 'edge', dir: 1 }
    case 'Home':
      return e.shiftKey ? null : { kind: 'edge', dir: -1 }
    case ' ':
    case 'Spacebar':
      // Space pages down; Shift+Space pages up — the reader's convention.
      return { kind: 'page', dir: e.shiftKey ? -1 : 1 }
    default:
      return null
  }
}

/**
 * Controls that own the keys we would otherwise take. The quick-check list
 * moves focus between its cards with the arrows (a deliberate shortcut), the
 * segmented radios move the selection, and everything editable moves a caret.
 */
export const KEY_OWNER_SELECTOR = [
  'input',
  'textarea',
  'select',
  'button[aria-haspopup]',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[contenteditable="plaintext-only"]',
  '[role="textbox"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="combobox"]',
  '[role="listbox"]',
  '[role="menu"]',
  '[role="menubar"]',
  '[role="radiogroup"]',
  '[role="tablist"]',
  '[role="tree"]',
  '[role="grid"]',
  '[role="application"]',
  '.qc-list',
].join(', ')

export const MODAL_SELECTOR = '[role="dialog"][aria-modal="true"]'

type ElementLike = {
  closest(selector: string): unknown
  isContentEditable?: boolean
}

/** True when the event target (or an ancestor) should keep the key. */
export function targetOwnsScrollKeys(target: ElementLike | null | undefined): boolean {
  if (!target || typeof target.closest !== 'function') return false
  if (target.isContentEditable) return true
  return Boolean(target.closest(KEY_OWNER_SELECTOR))
}

/**
 * Space presses these; it must never scroll past a button the reader is
 * about to activate. Arrows and Page keys on them still scroll, as native.
 * Links are not here: Space on a link scrolls natively, and so it does here.
 */
export const SPACE_OWNER_SELECTOR = [
  'button',
  'summary',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="option"]',
  '[role="treeitem"]',
].join(', ')

/** True when Space would activate the target rather than scroll. */
export function targetOwnsSpace(target: ElementLike | null | undefined): boolean {
  if (!target || typeof target.closest !== 'function') return false
  return Boolean(target.closest(SPACE_OWNER_SELECTOR))
}

type DocumentLike = { querySelector(selector: string): unknown }

/** A modal dialog (Sheet, upgrade prompt) is open — it owns the keyboard. */
export function modalIsOpen(doc: DocumentLike): boolean {
  return Boolean(doc.querySelector(MODAL_SELECTOR))
}

/**
 * The whole precedence in one place: what a key press on `target` should do
 * to the pane, or null to leave the browser's default alone.
 */
export function studyScrollDecision(
  e: KeyLike,
  target: ElementLike | null | undefined,
  doc: DocumentLike
): StudyScrollIntent | null {
  if (modalIsOpen(doc)) return null
  const intent = studyScrollIntent(e)
  if (!intent) return null
  if (targetOwnsScrollKeys(target)) return null
  if ((e.key === ' ' || e.key === 'Spacebar') && targetOwnsSpace(target)) return null
  return intent
}

export type ScrollMetrics = {
  scrollTop: number
  clientHeight: number
  scrollHeight: number
  /** Height of the sticky bar at the top of the pane, kept out of a page step. */
  stickyTop?: number
}

/** How far a page key moves: the visible reading area, minus a little overlap. */
export function pageStep(clientHeight: number, stickyTop = 0): number {
  const visible = Math.max(0, clientHeight - Math.max(0, stickyTop))
  return Math.max(LINE_STEP, Math.round(visible * PAGE_FRACTION))
}

/** Furthest scrollTop the pane can reach. */
export function maxScrollTop(m: ScrollMetrics): number {
  return Math.max(0, Math.ceil(m.scrollHeight - m.clientHeight))
}

/**
 * Where the pane should end up. `from` is the position the press is measured
 * against: normally scrollTop, but while a smooth scroll is still travelling
 * it is the target of that scroll, so held or rapid keys add up like native
 * scrolling instead of restarting from wherever the animation happens to be.
 */
export function nextScrollTop(
  intent: StudyScrollIntent,
  m: ScrollMetrics,
  from: number = m.scrollTop
): number {
  const max = maxScrollTop(m)
  if (intent.kind === 'edge') return intent.dir > 0 ? max : 0
  const step = intent.kind === 'line' ? LINE_STEP : pageStep(m.clientHeight, m.stickyTop)
  const target = from + intent.dir * step
  return Math.min(max, Math.max(0, Math.round(target)))
}

/**
 * How long a scroll animation is trusted as "still going". A press inside this
 * window measures from the previous target; after it, from the live position.
 */
export const PENDING_TARGET_MS = 400

export type PendingTarget = { top: number; at: number }

/** Pick the position a new press should measure from. */
export function scrollFrom(
  pending: PendingTarget | null,
  scrollTop: number,
  now: number
): number {
  if (!pending) return scrollTop
  if (now - pending.at > PENDING_TARGET_MS) return scrollTop
  return pending.top
}
