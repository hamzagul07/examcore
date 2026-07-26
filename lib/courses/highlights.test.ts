import {
  addHighlight,
  removeHighlight,
  highlightAt,
  normalise,
  parse,
  serialize,
  spansFor,
  byKind,
  kindsPresent,
  storageKey,
  HIGHLIGHT_KINDS,
  HIGHLIGHT_META,
  type Highlight,
} from './highlights'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

const mk = (
  start: number,
  end: number,
  kind: Highlight['kind'] = 'key',
  section = 'notes',
  text = 'x'
): Omit<Highlight, 'id'> => ({ section, start, end, kind, text })

// ── Normalising ─────────────────────────────────────────────────────────────
// Dragging right-to-left is completely normal and produces a backwards range.
// Storing it unnormalised means it silently never renders.
check('backwards range is flipped', normalise(20, 5)?.start === 5)
check('backwards range keeps its end', normalise(20, 5)?.end === 20)
check('empty range is rejected', normalise(7, 7) === null)
check('negative start is clamped', normalise(-5, 4)?.start === 0)

// ── Merging same-kind overlaps ──────────────────────────────────────────────
// Dragging over the same sentence twice must not leave two marks, or removing
// one leaves a ragged half-highlight behind.
{
  let hs = addHighlight([], mk(10, 20), 'a')
  hs = addHighlight(hs, mk(15, 30), 'b')
  check('overlapping same kind merge into one', hs.length === 1)
  check('merged range spans both', hs[0]!.start === 10 && hs[0]!.end === 30)

  // Adjacent counts as overlapping — two touching marks read as one.
  let adj = addHighlight([], mk(0, 10), 'a')
  adj = addHighlight(adj, mk(10, 20), 'b')
  check('touching ranges merge', adj.length === 1 && adj[0]!.end === 20)

  // Separate ranges stay separate.
  let apart = addHighlight([], mk(0, 5), 'a')
  apart = addHighlight(apart, mk(40, 50), 'b')
  check('disjoint ranges stay separate', apart.length === 2)
}

// A different section never merges, however much the numbers overlap.
{
  let hs = addHighlight([], mk(10, 20, 'key', 'notes'), 'a')
  hs = addHighlight(hs, mk(10, 20, 'key', 'worked'), 'b')
  check('same offsets in another section stay separate', hs.length === 2)
}

// ── Different kinds ─────────────────────────────────────────────────────────
// Marking part of a key point as "don't get it" is deliberate; the later mark
// wins on the overlap and the rest of the original survives.
{
  let hs = addHighlight([], mk(0, 100, 'key', 'notes', '0123456789'.repeat(10)), 'a')
  hs = addHighlight(hs, mk(40, 60, 'unclear'), 'b')
  check('later kind splits the earlier one', hs.length === 3)
  check('the new mark is intact', hs.some((h) => h.start === 40 && h.end === 60 && h.kind === 'unclear'))
  check('left remainder survives', hs.some((h) => h.start === 0 && h.end === 40 && h.kind === 'key'))
  check('right remainder survives', hs.some((h) => h.start === 60 && h.end === 100 && h.kind === 'key'))
  check('remainders have distinct ids', new Set(hs.map((h) => h.id)).size === hs.length)

  // Fully covering an earlier mark of another kind removes it entirely.
  let over = addHighlight([], mk(10, 20, 'key'), 'a')
  over = addHighlight(over, mk(0, 40, 'exam'), 'b')
  check('full cover replaces', over.length === 1 && over[0]!.kind === 'exam')
}

// ── Lookup and removal ──────────────────────────────────────────────────────
{
  const hs = addHighlight([], mk(10, 20), 'a')
  check('offset inside is found', highlightAt(hs, 'notes', 15)?.id === 'a')
  check('start is inclusive', highlightAt(hs, 'notes', 10)?.id === 'a')
  check('end is exclusive', highlightAt(hs, 'notes', 20) === null)
  check('wrong section is not found', highlightAt(hs, 'worked', 15) === null)
  check('removal works', removeHighlight(hs, 'a').length === 0)
  check('removing what is not there is safe', removeHighlight(hs, 'zzz').length === 1)
}

// ── Spans for rendering ─────────────────────────────────────────────────────
// The renderer walks text nodes once, so the spans must tile 0..length exactly:
// no gaps, no overlaps, in order. Anything else drops or duplicates prose.
{
  let hs = addHighlight([], mk(10, 20, 'key'), 'a')
  hs = addHighlight(hs, mk(40, 50, 'unclear'), 'b')
  const spans = spansFor(hs, 'notes', 100)
  check('spans start at zero', spans[0]!.start === 0)
  check('spans end at length', spans[spans.length - 1]!.end === 100)
  check(
    'spans tile with no gaps',
    spans.every((s, i) => i === 0 || s.start === spans[i - 1]!.end)
  )
  check('spans are never empty', spans.every((s) => s.end > s.start))
  check('two are highlighted', spans.filter((s) => s.kind).length === 2)
  check('no spans for another section', spansFor(hs, 'elsewhere', 100).length === 1)
  check('empty section yields nothing', spansFor([], 'notes', 0).length === 0)

  // A stored highlight running past the end of shortened content must clamp
  // rather than produce a span outside the text.
  const past = spansFor([{ id: 'x', section: 'notes', start: 90, end: 500, kind: 'key', text: '' }], 'notes', 100)
  check('over-long highlight clamps to length', past[past.length - 1]!.end === 100)
}

// ── Storage ─────────────────────────────────────────────────────────────────
{
  const hs = addHighlight([], mk(10, 20, 'exam', 'notes', 'some words'), 'a')
  check('round trips', parse(serialize(hs)).length === 1)
  check('round trip keeps the kind', parse(serialize(hs))[0]!.kind === 'exam')
  check('round trip keeps the words', parse(serialize(hs))[0]!.text === 'some words')

  // Corrupt storage must lose highlights, never break the lesson.
  check('null is safe', parse(null).length === 0)
  check('garbage is safe', parse('not json').length === 0)
  check('wrong shape is safe', parse('{"items":"nope"}').length === 0)
  check('array at the top level is safe', parse('[1,2,3]').length === 0)
  // One bad row must not discard the good ones.
  const mixed = parse('{"v":1,"items":[{"section":"a","start":0,"end":5,"kind":"key"},{"section":"b"},{"start":1,"end":2}]}')
  check('bad rows are dropped individually', mixed.length === 1)
  check('an unknown kind falls back rather than dropping', parse('{"v":1,"items":[{"section":"a","start":0,"end":5,"kind":"purple"}]}')[0]?.kind === 'key')
  check('a row with no id gets one', !!mixed[0]!.id)
}

// ── Recap grouping ──────────────────────────────────────────────────────────
{
  let hs = addHighlight([], mk(40, 50, 'unclear'), 'b')
  hs = addHighlight(hs, mk(10, 20, 'key'), 'a')
  check('grouping filters by kind', byKind(hs, 'key').length === 1)
  check('grouping is in reading order', byKind(hs, 'key')[0]!.start === 10)
  check('kinds present is canonical order', kindsPresent(hs).join(',') === 'key,unclear')
  check('no highlights means no kinds', kindsPresent([]).length === 0)
}

check('every kind has copy', HIGHLIGHT_KINDS.every((k) => !!HIGHLIGHT_META[k]?.label))
check('every kind has a recap title', HIGHLIGHT_KINDS.every((k) => !!HIGHLIGHT_META[k]?.recapTitle))
check('storage key is scoped to the lesson', storageKey('a1-1') !== storageKey('a1-2'))

if (failed > 0) process.exit(1)
console.log('highlights.test.ts: all checks passed')
