import assert from 'node:assert/strict'
import { matchDiagramToQuestion } from './diagram-persist'
import type { DetectedDiagram } from './diagram-extractor'
import type { QuestionWithIds } from './question-tree'

function question(
  partial: Partial<QuestionWithIds> & Pick<QuestionWithIds, 'id' | 'question_number'>
): QuestionWithIds {
  return {
    question_path: partial.question_number,
    parent_question_number: null,
    depth: 0,
    is_leaf: true,
    question_text: 'text',
    marks: 2,
    source_page_numbers: [4],
    options: null,
    tables: null,
    figure_refs: [],
    extraction_method: 'gemini-pro',
    extraction_confidence: 0.95,
    needs_manual_review: false,
    needs_re_extraction: false,
    raw_extraction_data: {},
    parent_question_id: null,
    ...partial,
  }
}

const diagram: DetectedDiagram = {
  label: 'Fig. 4.2',
  page: 4,
  bounding_box: { page: 4, x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
  caption: null,
  png: Buffer.from(''),
  ai_description: null,
  description_status: 'pending',
}

const byRef = question({
  id: 'q-fig',
  question_number: '7',
  figure_refs: ['Fig. 4.2'],
  source_page_numbers: [4],
})

const other = question({
  id: 'q-other',
  question_number: '8',
  source_page_numbers: [4],
})

assert.equal(matchDiagramToQuestion(diagram, [other, byRef])?.id, 'q-fig')

const pageOnly = question({
  id: 'q-page',
  question_number: '3',
  source_page_numbers: [4],
  depth: 0,
})

assert.equal(matchDiagramToQuestion(diagram, [pageOnly])?.id, 'q-page')

console.log('diagram-persist.test.ts: ok')
