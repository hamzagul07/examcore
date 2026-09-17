import assert from 'node:assert/strict'
import {
  LINE_STEP,
  PENDING_TARGET_MS,
  KEY_OWNER_SELECTOR,
  SPACE_OWNER_SELECTOR,
  maxScrollTop,
  modalIsOpen,
  nextScrollTop,
  pageStep,
  scrollFrom,
  studyScrollDecision,
  studyScrollIntent,
  targetOwnsScrollKeys,
  targetOwnsSpace,
} from './study-scroll'

// ── Which keys scroll ──────────────────────────────────────────────────────
assert.deepEqual(studyScrollIntent({ key: 'ArrowDown' }), { kind: 'line', dir: 1 })
assert.deepEqual(studyScrollIntent({ key: 'ArrowUp' }), { kind: 'line', dir: -1 })
assert.deepEqual(studyScrollIntent({ key: 'PageDown' }), { kind: 'page', dir: 1 })
assert.deepEqual(studyScrollIntent({ key: 'PageUp' }), { kind: 'page', dir: -1 })
assert.deepEqual(studyScrollIntent({ key: 'End' }), { kind: 'edge', dir: 1 })
assert.deepEqual(studyScrollIntent({ key: 'Home' }), { kind: 'edge', dir: -1 })
assert.deepEqual(studyScrollIntent({ key: ' ' }), { kind: 'page', dir: 1 })
assert.deepEqual(studyScrollIntent({ key: ' ', shiftKey: true }), { kind: 'page', dir: -1 })
assert.deepEqual(studyScrollIntent({ key: 'Spacebar' }), { kind: 'page', dir: 1 })

// Not ours: navigation keys, letters, Tab, Escape, Enter.
for (const key of ['ArrowLeft', 'ArrowRight', 'Tab', 'Escape', 'Enter', 'a', 'j', 'k']) {
  assert.equal(studyScrollIntent({ key }), null, `${key} is not a scroll key`)
}

// Browser shortcuts stay with the browser.
assert.equal(studyScrollIntent({ key: 'ArrowDown', ctrlKey: true }), null)
assert.equal(studyScrollIntent({ key: 'ArrowDown', metaKey: true }), null)
assert.equal(studyScrollIntent({ key: 'ArrowDown', altKey: true }), null)
assert.equal(studyScrollIntent({ key: 'End', metaKey: true }), null)
assert.equal(studyScrollIntent({ key: ' ', ctrlKey: true }), null)

// Shift+arrow / Shift+Page / Shift+Home/End extend a selection — leave them.
assert.equal(studyScrollIntent({ key: 'ArrowDown', shiftKey: true }), null)
assert.equal(studyScrollIntent({ key: 'PageDown', shiftKey: true }), null)
assert.equal(studyScrollIntent({ key: 'Home', shiftKey: true }), null)

// ── Who owns the keys ──────────────────────────────────────────────────────
const el = (matches: string[], extra: Partial<{ isContentEditable: boolean }> = {}) => ({
  ...extra,
  closest: (sel: string) => (sel === KEY_OWNER_SELECTOR && matches.length ? {} : null),
})

assert.equal(targetOwnsScrollKeys(null), false)
assert.equal(targetOwnsScrollKeys(undefined), false)
assert.equal(targetOwnsScrollKeys(el([])), false, 'plain paragraph scrolls the pane')
assert.equal(targetOwnsScrollKeys(el(['textarea'])), true, 'textarea keeps its caret')
assert.equal(targetOwnsScrollKeys(el(['.qc-list'])), true, 'quick check keeps its arrows')
assert.equal(targetOwnsScrollKeys(el([], { isContentEditable: true })), true)
// Every control named in the brief is in the selector.
for (const s of [
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '[role="textbox"]',
  '[role="slider"]',
  '[role="radiogroup"]',
  '.qc-list',
]) {
  assert.ok(KEY_OWNER_SELECTOR.includes(s), `${s} owns its keys`)
}

// Space activates buttons; arrows on a button still scroll (as native).
const button = {
  closest: (sel: string) => (sel === SPACE_OWNER_SELECTOR ? {} : null),
}
assert.equal(targetOwnsSpace(button), true)
assert.equal(targetOwnsSpace(el([])), false)
assert.ok(SPACE_OWNER_SELECTOR.includes('button'))
assert.ok(SPACE_OWNER_SELECTOR.includes('summary'))
assert.ok(!SPACE_OWNER_SELECTOR.includes('a[href]'), 'Space on a link scrolls, as native')

// ── Dialogs ────────────────────────────────────────────────────────────────
const noModal = { querySelector: () => null }
const withModal = {
  querySelector: (s: string) => (s === '[role="dialog"][aria-modal="true"]' ? {} : null),
}
assert.equal(modalIsOpen(noModal), false)
assert.equal(modalIsOpen(withModal), true)

// ── The precedence, end to end ─────────────────────────────────────────────
// 1. dialog open beats everything
assert.equal(studyScrollDecision({ key: 'ArrowDown' }, el([]), withModal), null)
// 2. editable / widget beats pane scroll
assert.equal(studyScrollDecision({ key: 'ArrowDown' }, el(['textarea']), noModal), null)
assert.equal(studyScrollDecision({ key: 'PageDown' }, el(['.qc-list']), noModal), null)
// 3. modifiers beat pane scroll
assert.equal(studyScrollDecision({ key: 'ArrowDown', metaKey: true }, el([]), noModal), null)
// 4. Space on a button activates it; arrows on the same button scroll
assert.equal(studyScrollDecision({ key: ' ' }, button, noModal), null)
assert.deepEqual(studyScrollDecision({ key: 'ArrowDown' }, button, noModal), { kind: 'line', dir: 1 })
// 5. otherwise the pane scrolls — including with focus on <body> (null target)
assert.deepEqual(studyScrollDecision({ key: 'ArrowDown' }, el([]), noModal), { kind: 'line', dir: 1 })
assert.deepEqual(studyScrollDecision({ key: ' ' }, null, noModal), { kind: 'page', dir: 1 })
assert.deepEqual(studyScrollDecision({ key: 'End' }, null, noModal), { kind: 'edge', dir: 1 })
assert.equal(studyScrollDecision({ key: 'Tab' }, el([]), noModal), null)
assert.equal(studyScrollDecision({ key: 'Escape' }, el([]), noModal), null)

// ── Distances ──────────────────────────────────────────────────────────────
const m = { scrollTop: 1000, clientHeight: 900, scrollHeight: 10000, stickyTop: 56 }
assert.equal(maxScrollTop(m), 9100)
assert.equal(maxScrollTop({ scrollTop: 0, clientHeight: 900, scrollHeight: 500 }), 0, 'short pane')

assert.equal(pageStep(900, 56), Math.round((900 - 56) * 0.875))
assert.equal(pageStep(900), Math.round(900 * 0.875))
assert.equal(pageStep(10, 56), LINE_STEP, 'never smaller than a line')

assert.equal(nextScrollTop({ kind: 'line', dir: 1 }, m), 1000 + LINE_STEP)
assert.equal(nextScrollTop({ kind: 'line', dir: -1 }, m), 1000 - LINE_STEP)
assert.equal(nextScrollTop({ kind: 'page', dir: 1 }, m), 1000 + pageStep(900, 56))
assert.equal(nextScrollTop({ kind: 'page', dir: -1 }, m), 1000 - pageStep(900, 56))
assert.equal(nextScrollTop({ kind: 'edge', dir: 1 }, m), 9100)
assert.equal(nextScrollTop({ kind: 'edge', dir: -1 }, m), 0)

// Boundaries clamp, never go negative, never past the end.
assert.equal(nextScrollTop({ kind: 'line', dir: -1 }, { ...m, scrollTop: 0 }), 0)
assert.equal(nextScrollTop({ kind: 'page', dir: -1 }, { ...m, scrollTop: 10 }), 0)
assert.equal(nextScrollTop({ kind: 'line', dir: 1 }, { ...m, scrollTop: 9100 }), 9100)
assert.equal(nextScrollTop({ kind: 'page', dir: 1 }, { ...m, scrollTop: 9000 }), 9100)

// Measured from an in-flight target when one is given.
assert.equal(nextScrollTop({ kind: 'line', dir: 1 }, m, 1040), 1080)

// ── Rapid presses add up ───────────────────────────────────────────────────
assert.equal(scrollFrom(null, 500, 1000), 500)
assert.equal(scrollFrom({ top: 540, at: 1000 }, 500, 1100), 540, 'still animating: from target')
assert.equal(
  scrollFrom({ top: 540, at: 1000 }, 700, 1000 + PENDING_TARGET_MS + 1),
  700,
  'stale target: from the live position (wheel may have moved it)'
)

console.log('study-scroll.test.ts: all checks passed')
