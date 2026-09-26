import assert from 'node:assert/strict'
import { pipGlyph } from '@/lib/marking/pip-glyph'

/**
 * Every earned pip used to read "M" and every lost one "X", so an A1 and a B1
 * looked the same as an M1 — while the script beside them and the list below
 * named each mark properly.
 */
function main() {
  // Examiner codes are shown as written; a withheld mark is written with a 0.
  assert.equal(pipGlyph('M1', true), 'M1')
  assert.equal(pipGlyph('A1', true), 'A1')
  assert.equal(pipGlyph('B1', false), 'B0')
  assert.equal(pipGlyph('B2', false), 'B0')
  assert.equal(pipGlyph('DM1', true), 'DM1')
  assert.equal(pipGlyph(' A1 ', true), 'A1', 'whitespace around a code is ignored')

  // Anything that is not a short code falls back to tick / cross, and the two
  // states never share a glyph.
  assert.equal(pipGlyph('Mark 3', true), '✓')
  assert.equal(pipGlyph('Mark 3', false), '✗')
  assert.equal(pipGlyph('', true), '✓')
  assert.equal(pipGlyph('method', false), '✗')
  assert.equal(pipGlyph('M12', true), '✓', 'a two-digit mark is not a code shape we render')

  for (const label of ['M1', 'A1', 'B1', 'Mark 1', '']) {
    assert.notEqual(pipGlyph(label, true), pipGlyph(label, false), `${label}: earned and lost differ`)
  }

  console.log('pip-glyph: ok')
}

main()
