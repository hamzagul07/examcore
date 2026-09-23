import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  SHAREABLE_TAKEAWAY_BLOCK,
  buildPointBasedMarkingPrompt,
  buildVerifyMarkingPrompt,
} from '@/lib/marking/prompts'
import { normalizeMarkingResult } from '@/lib/marking/normalize-math'
import { toMarkingAIResult } from '@/lib/marking/whole-paper'

/**
 * The shareable takeaway: the one line of examiner prose that leaves the app
 * (in the mark-ready email). It is generated under its own rules rather than
 * filtered from the in-app study note, so the rules must reach every marking
 * dialect and the field must survive every hop to the email.
 */

// Every marking prompt asks for it, with the rules, and so does the verifier.
const src = readFileSync(resolve('lib/marking/prompts.ts'), 'utf8')
const templates = (src.match(/"what_to_study_next": "\.\.\."/g) || []).length
const fields = (src.match(/"shareable_takeaway": "\.\.\."/g) || []).length
assert.ok(templates >= 11, `expected the marking templates, saw ${templates}`)
assert.equal(fields, templates, 'every output template that has a study note has a takeaway')
const blocks = (src.match(/\$\{SHAREABLE_TAKEAWAY_BLOCK\}/g) || []).length
assert.equal(blocks, templates + 1, 'the rules reach every marking builder and the verifier')

const prompt = buildPointBasedMarkingPrompt('Mathematics', 'Find dy/dx.', 3, '{}', 'y = x^2')
assert.match(prompt, /"shareable_takeaway": "\.\.\."/)
assert.match(prompt, /SHAREABLE TAKEAWAY/)
assert.match(SHAREABLE_TAKEAWAY_BLOCK, /must NOT contain/)
assert.match(SHAREABLE_TAKEAWAY_BLOCK, /B1, M1, A1/)
assert.match(SHAREABLE_TAKEAWAY_BLOCK, /return ""/)
assert.match(SHAREABLE_TAKEAWAY_BLOCK, /no Markdown/, 'it is read in an email client')
assert.match(SHAREABLE_TAKEAWAY_BLOCK, /no LaTeX/)

const verify = buildVerifyMarkingPrompt({
  subjectName: 'Mathematics',
  board: 'Cambridge',
  questionText: 'q',
  ocrText: 'a',
  schemeJson: null,
  priorResultJson: '{}',
  totalMarks: 3,
})
assert.match(verify, /Keep "shareable_takeaway"/)
assert.match(verify, /SHAREABLE TAKEAWAY/)

// It survives normalisation (LaTeX prose pass) and the whole-paper mapper.
const normalised = normalizeMarkingResult({
  summary: 's',
  what_to_study_next: 'w',
  shareable_takeaway: 'Rewrite $x^2$ as a power before you differentiate.',
})
assert.match(String(normalised.shareable_takeaway), /Rewrite/)

const mapped = toMarkingAIResult({
  marks_earned: 2,
  total_marks: 3,
  summary: 's',
  shareable_takeaway: 'Show every step.',
})
assert.equal(mapped.shareable_takeaway, 'Show every step.')
assert.equal(toMarkingAIResult({}).shareable_takeaway, undefined)

console.log('shareable-takeaway.test.ts: ok')
