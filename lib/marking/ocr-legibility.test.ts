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

  // The SAME script re-read, without the CJK glyph. The first version of this
  // check passed it: only WPOT and WprR lack a vowel, because WBET and INBRR
  // contain E and I, so the count fell below the threshold. The (b)(i) working
  // is still plainly unread, so it must still be caught.
  const reread = assessOcrLegibility(
    '2 clockutise anticlockwise\nWPOT IRR WBET INBRR\nWprR\n=\nWB-R\nW+R\n' +
      "R = 17.658\n17.7\nHooke's Law\nThe state at which object has ability to " +
      "restore it's original shape after streching. It does not obey hooke's law"
  )
  assert.equal(reread.illegible, true, 're-read of the same unread working must still be caught')
  assert.match(reread.reason ?? '', /consecutive all-caps/, 'caught by the caps run, not the CJK glyph')

  // --- things that must NOT be called illegible --------------------------------

  // Real abbreviations, including several close together. Exam answers do shout
  // occasionally, and that must not read as a failed transcription.
  const abbreviations = assessOcrLegibility(
    'The EMF of the cell drives the current. Using KE and PE, the SHM equation on ' +
      'the RHS gives the amplitude. DNA and ATP are named in the IUPAC guidance.'
  )
  assert.equal(abbreviations.illegible, false, 'known abbreviations are not gibberish')
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
