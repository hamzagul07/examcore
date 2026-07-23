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

  console.log('examiner-ink-positioning.test.ts: ok')
}

main()
