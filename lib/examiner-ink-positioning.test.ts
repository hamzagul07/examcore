import assert from 'node:assert/strict'
import { buildLineReferences } from '@/lib/examiner-ink-positioning'

function main() {
  // The bug this guards: two marks share a stamp code ("M1"), so selecting by
  // code lit up both. Each reference must now carry a UNIQUE ref_id (its index),
  // so the two are independently selectable even though their codes collide.
  const refs = buildLineReferences(
    [
      { mark_id: 1, type: 'M1', earned: true, line_reference: 'dy/dx = 3x^2' },
      { mark_id: 2, type: 'M1', earned: true, line_reference: '(x-1)(x-3)=0' },
      { mark_id: 3, type: 'A1', earned: true, line_reference: 'x = 1 or x = 3' },
    ],
    [
      { text: 'dy/dx = 3x^2', bbox: { top: 5, left: 10, width: 30, height: 4 } },
      { text: '(x-1)(x-3)=0', bbox: { top: 20, left: 10, width: 25, height: 4 } },
      { text: 'x = 1 or x = 3', bbox: { top: 35, left: 10, width: 22, height: 4 } },
    ]
  )

  assert.equal(refs.length, 3)
  // Codes collide...
  assert.equal(refs[0].mark_id, 'M1')
  assert.equal(refs[1].mark_id, 'M1')
  // ...but ref_ids are the array index, so they are distinct and unique.
  assert.equal(refs[0].ref_id, '0')
  assert.equal(refs[1].ref_id, '1')
  assert.equal(refs[2].ref_id, '2')
  const ids = refs.map((r) => r.ref_id)
  assert.equal(new Set(ids).size, ids.length, 'ref_ids must be unique')

  // ref_id is the GLOBAL index even when a later page rebuilds against different
  // OCR lines: buildLineReferences runs over the full marks array every time, so
  // a mark that only positions on page 2 keeps the same ref_id there.
  const page2 = buildLineReferences(
    [
      { mark_id: 1, type: 'M1', earned: true, line_reference: 'page 1 only' },
      { mark_id: 2, type: 'B1', earned: false, line_reference: 'on page two' },
    ],
    [{ text: 'on page two', bbox: { top: 5, left: 10, width: 30, height: 4 } }]
  )
  const positioned = page2.filter((r) => r.bbox != null)
  assert.equal(positioned.length, 1)
  assert.equal(positioned[0].mark_id, 'B1')
  assert.equal(positioned[0].ref_id, '1', 'keeps its global index, not a per-page 0')

  // Short maths quotes must still land on the page.
  //
  // Containment used to score by length ratio, so an EXACT match of a short
  // quote inside a long line came out around 0.03 and the 0.35 threshold binned
  // it. Maths and chemistry marks are quoted exactly like this, and on real
  // uploads a quarter of all marks were arriving with no position at all.
  const mathLines = [
    { text: 'Substituting into the formula we obtain k = 8 after simplifying', bbox: { top: 5, left: 10, width: 60, height: 4 } },
    { text: 'therefore median = mean for this distribution', bbox: { top: 20, left: 10, width: 40, height: 4 } },
    { text: 'and so f(x)=0 at both endpoints', bbox: { top: 35, left: 10, width: 30, height: 4 } },
  ]
  const place = (quote: string) =>
    buildLineReferences(
      [{ mark_id: 1, type: 'M1', earned: true, line_reference: quote }],
      mathLines
    )[0]
  for (const q of ['k = 8', 'median = mean', 'f(x)=0']) {
    assert.ok(place(q).bbox, `short maths quote should position: ${q}`)
  }

  // The tightest containing line wins, not merely the first that matches.
  const tie = buildLineReferences(
    [{ mark_id: 1, type: 'M1', earned: true, line_reference: 'median = mean' }],
    [
      { text: 'a far longer line that also says median = mean somewhere inside', bbox: { top: 1, left: 0, width: 90, height: 4 } },
      { text: 'median = mean', bbox: { top: 50, left: 0, width: 12, height: 4 } },
    ]
  )[0]
  assert.equal(tie.bbox?.top, 50, 'tightest containing line should win')

  // Too short to trust: "A1" is a mark code, not something the student wrote,
  // and at two characters it would match almost any line.
  assert.equal(place('A1').bbox, null, 'two-character snippet stays unplaced')

  console.log('examiner-ink-positioning.test.ts: ok')
}

main()

/**
 * A mark may not quote a student saying something they did not say.
 *
 * From a real attempt: a 2-mark "show that" scored 0/2, with M1 withheld and
 * `line_reference: "Wp*d + R*d = WB*d"` — a line absent from all 694 characters
 * of the transcript. The prompt requires the reference to be copied from the
 * student's answer; a model that has lost the thread invents one instead, and
 * the invention was stored and shown as if it were their working.
 */
function invented_line_references_are_not_echoed_back() {
  const ocrLines = [
    { text: '2 clockwise anticlockwise', bbox: { top: 10, left: 5, width: 40, height: 4 } },
    { text: 'WprR = W+R', bbox: { top: 20, left: 5, width: 30, height: 4 } },
  ]

  const refs = buildLineReferences(
    [
      { mark_id: 1, type: 'M1', earned: false, line_reference: 'Wp*d + R*d = WB*d', margin_note: 'Not the correct moment equation.' },
      { mark_id: 2, type: 'A1', earned: false, line_reference: 'WprR = W+R', margin_note: 'Missing steps.' },
    ],
    ocrLines
  )

  assert.equal(refs[0].snippet, '', 'a citation absent from the script must not be shown back')
  assert.equal(refs[0].bbox, null, 'and must not be positioned on the handwriting')
  assert.equal(refs[0].unmatched_reference, true, 'it is flagged, not silently dropped')
  assert.equal(refs[0].margin_note, 'Not the correct moment equation.', 'the examiner note survives')

  assert.equal(refs[1].snippet, 'WprR = W+R', 'a citation that IS in the script is kept')
  assert.equal(refs[1].unmatched_reference, false)

  // With no OCR lines there is nothing to check against, so nothing is claimed:
  // the snippet is preserved rather than blamed on a model that may be right.
  const noLines = buildLineReferences(
    [{ mark_id: 1, type: 'M1', earned: true, line_reference: 'x = 5' }],
    []
  )
  assert.equal(noLines[0].snippet, 'x = 5', 'without OCR lines the snippet is kept')
  assert.equal(noLines[0].unmatched_reference, false, 'and nothing is flagged')

  console.log('invented line references: ok')
}

invented_line_references_are_not_echoed_back()
