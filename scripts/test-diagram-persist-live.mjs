#!/usr/bin/env node
/**
 * Live smoke: upload + DB insert for one diagram row (no Vertex calls).
 * Usage: npx tsx scripts/test-diagram-persist-live.mjs cambridge/9702/s24/qp_42.pdf
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const p = join(ROOT, '.env.local')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (process.env[k] === undefined) process.env[k] = v
  }
}

async function main() {
  loadEnv()
  const pdfPath = process.argv[2] ?? 'cambridge/9702/s24/qp_42.pdf'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { persistExtractedDiagrams } = await import('../lib/extraction/diagram-persist.ts')
  const { loadQuestionsForDiagramMatch } = await import('../lib/extraction/question-tree.ts')
  const { parseQuestionPaperPath } = await import('../lib/extraction/paper-meta.ts')

  const meta = parseQuestionPaperPath(pdfPath)
  if (!meta) throw new Error(`Bad path: ${pdfPath}`)

  const questions = await loadQuestionsForDiagramMatch(supabase, pdfPath)
  const q = questions.find((row) => row.source_page_numbers.includes(4))
  if (!q) throw new Error('No question on page 4')

  const tinyPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  )

  const result = await persistExtractedDiagrams(
    supabase,
    meta,
    [q],
    [
      {
        label: 'Fig. smoke-test',
        page: 4,
        bounding_box: { page: 4, x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
        caption: 'live smoke test',
        png: tinyPng,
        ai_description: null,
        description_status: 'pending',
      },
    ],
    pdfPath
  )

  console.log('Live persist OK:', result)

  const { count } = await supabase
    .from('extracted_diagrams')
    .select('id', { count: 'exact', head: true })
    .eq('question_id', q.id)

  console.log(`DB rows for question ${q.question_number}: ${count}`)
  if ((count ?? 0) < 1) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
