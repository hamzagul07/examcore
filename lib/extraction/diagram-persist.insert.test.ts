import assert from 'node:assert/strict'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  EXTRACTED_DIAGRAMS_BUCKET,
  persistExtractedDiagrams,
} from './diagram-persist'
import type { DetectedDiagram } from './diagram-extractor'
import type { QuestionWithIds } from './question-tree'
import type { ParsedPaperMeta } from './paper-meta'

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'

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

const meta: ParsedPaperMeta = {
  storagePrefix: '9702/2024/s24',
  subjectCode: '9702',
  sessionCode: 's24',
  session: 'May/June',
  year: 2024,
  component: '42',
  paperNumber: '4',
  variant: '2',
  paperKind: 'structured',
  sourcePdfPath: '9702/2024/s24/qp_42.pdf',
}

const diagram: DetectedDiagram = {
  label: 'Fig. 4.2',
  page: 4,
  bounding_box: { page: 4, x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
  caption: 'test caption',
  png: Buffer.from('fake-png-bytes'),
  ai_description: null,
  description_status: 'pending',
}

const inserts: Record<string, unknown>[] = []
const uploads: string[] = []

const supabase = {
  storage: {
    from: (bucket: string) => {
      assert.equal(bucket, EXTRACTED_DIAGRAMS_BUCKET)
      return {
        upload: async (path: string) => {
          uploads.push(path)
          return { error: null }
        },
      }
    },
  },
  from: (table: string) => {
    assert.equal(table, 'extracted_diagrams')
    return {
      insert: async (row: Record<string, unknown>) => {
        inserts.push(row)
        return { error: null }
      },
    }
  },
} as unknown as SupabaseClient

async function main() {
  const result = await persistExtractedDiagrams(
    supabase,
    meta,
    [question({ id: 'q-1', question_number: '4(a)', source_page_numbers: [4] })],
    [diagram],
    'cambridge/9702/s24/qp_42.pdf'
  )

  assert.equal(result.inserted, 1)
  assert.equal(result.uploads, 1)
  assert.equal(inserts.length, 1)
  assert.equal(inserts[0].question_id, 'q-1')
  assert.equal(inserts[0].description_status, 'pending')
  assert.ok(String(inserts[0].image_storage_path).includes('qp_42'))

  console.log('diagram-persist.insert.test.ts: ok')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
