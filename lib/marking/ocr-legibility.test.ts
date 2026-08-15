import assert from 'node:assert/strict'
import { assessOcrLegibility } from '@/lib/marking/ocr-legibility'

/**
 * The positive case is verbatim from a real attempt: a Physics script scored 0/2
 * against this transcription, which nobody could have marked.
 */
function main() {
  const real =
    '(i) Use Figure 2.2.to show that R+Wp = WB-R. [2] 2 clockutise anticlockwise ' +
    'WPOT IRR WBET INBRR +木村 R+++ X WprR = W+R WB-R'
  const bad = assessOcrLegibility(real)
  assert.equal(bad.illegible, true, 'the transcript that produced a wrong 0/2 must be caught')
  assert.ok(bad.reason, 'and must say why')

  // --- things that must NOT be called illegible --------------------------------
  const maths = assessOcrLegibility(
    '3x + 7 = 22 so 3x = 15 therefore x = 5. Substituting gives y = 2x^2 - 4x + 1 ' +
      'and sqrt(16) = 4, so the stationary point is at x = 1.'
  )
  assert.equal(maths.illegible, false, 'symbolic maths is not gibberish')

  const physics = assessOcrLegibility(
    'Taking moments about the pivot, the sum of clockwise moments equals the sum of ' +
      'anticlockwise moments. R = 17.7 N by Hooke law and elastic deformation applies.'
  )
  assert.equal(physics.illegible, false, 'a clean physics answer is not gibberish')

  const chemistry = assessOcrLegibility(
    'The rate equation is rate = k[A]^2[B]. NaCl and H2SO4 react to give HCl. ' +
      'The nth term of the series converges as shown in the RHS of the equation.'
  )
  assert.equal(chemistry.illegible, false, 'formulae and RHS/nth are ordinary')

  // Short inputs are the "no handwriting" case and belong to a different message.
  assert.equal(assessOcrLegibility('').illegible, false)
  assert.equal(assessOcrLegibility('x = 5').illegible, false)
  assert.equal(assessOcrLegibility(null).illegible, false)

  // One stray vowel-less token in a long, legible script is noise, not a failure.
  const oneOddToken = assessOcrLegibility(
    'The student explains that the force acts downwards and the resultant is zero. ' +
      'WXYZ marks the corner of the diagram, which is labelled clearly throughout.'
  )
  assert.equal(oneOddToken.illegible, false, 'a single odd token must not trip it')

  console.log('ocr-legibility.test.ts: ok')
}

main()
