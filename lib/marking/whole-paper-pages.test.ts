import assert from 'node:assert/strict'
import {
  pageIndicesForQuestion,
  segmentQuestionsByPageLabels,
  type StoredPageOcr,
} from './whole-paper-pages'

const page = (label: string | null, text = 'some working'): StoredPageOcr => ({
  photo_url: '',
  full_text: text,
  ocr_lines: [],
  question_label: label,
})

// --- segment ↔ page label matching ---------------------------------------------

const pages = [page('1'), page('3'), page('3(b)'), page('4(a)'), page(null)]

assert.deepEqual(pageIndicesForQuestion('1', pages), [0], 'exact match')
assert.deepEqual(pageIndicesForQuestion('3 (a)', pages), [1], 'a part matches a page labelled with the whole question')
assert.deepEqual(pageIndicesForQuestion('3(b)', pages), [1, 2], 'exact page plus the whole-question page')
assert.deepEqual(pageIndicesForQuestion('3', pages), [1, 2], 'the whole question owns its parts')
assert.deepEqual(pageIndicesForQuestion('4', pages), [3], 'only a part page exists → it answers for the whole question')
assert.deepEqual(pageIndicesForQuestion('4(b)', pages), [], 'a sibling part is a different answer')
assert.deepEqual(pageIndicesForQuestion('2', pages), [], 'nothing labelled 2 and more than one page → no guess')
assert.deepEqual(pageIndicesForQuestion('7', [page(null)]), [0], 'a single unlabelled page is attached regardless')

// --- page-range segmentation (fallback for a truncated model split) -----------
{
  const split = segmentQuestionsByPageLabels([
    page(null, 'cover sheet'),
    page('1', 'q1 first page'),
    page(null, 'q1 continued'),
    page('2', 'q2 page'),
    page('1', 'q1 late page'),
    page('3', ''),
  ])
  assert.deepEqual(
    split.map((q) => q.question_number),
    ['1', '2'],
    'one segment per label; a labelled page with no text is dropped; the cover page belongs to nothing'
  )
  assert.equal(
    split[0].answer_text,
    '[Page 2]\nq1 first page\n\n[Page 3]\nq1 continued\n\n[Page 5]\nq1 late page',
    'unlabelled pages continue the previous question; a later page with the same label rejoins it'
  )
  assert.equal(split[1].answer_text, '[Page 4]\nq2 page')
  assert.deepEqual(segmentQuestionsByPageLabels([page(null, 'x')]), [], 'no labels → nothing to split by')
}

console.log('whole-paper-pages: all assertions passed')
