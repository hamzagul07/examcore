#!/usr/bin/env node
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

process.env.USE_VERTEX_AI = 'false'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq < 0) continue
  const k = t.slice(0, eq).trim()
  let v = t.slice(eq + 1).trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  if (process.env[k] === undefined) process.env[k] = v
}

const SUBJECT = process.argv.find((a) => a.startsWith('--subject='))?.split('=')[1] || '9701'
const { loadSyllabusObjectivesFromJson, tagQuestions } = await import('../lib/extraction/topic-tagger.ts')
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const objectives = loadSyllabusObjectivesFromJson(ROOT, SUBJECT)
console.log('objectives', objectives.length, objectives.slice(0, 2))

const { data } = await sb
  .from('mark_schemes')
  .select('id,paper_code,paper_session,question_number,question_text,total_marks,syllabus_tags')
  .like('paper_code', `${SUBJECT}%`)
  .not('question_text', 'is', null)
  .eq('syllabus_tags', '{}')
  .limit(2)

const qs = (data || []).map((row) => {
  const comp = (row.paper_code || '').split('/')[1] || ''
  return {
    id: row.id,
    subject_code: SUBJECT,
    paper_number: comp[0] || '',
    variant: comp.slice(1) || '0',
    year: 2024,
    session: 's24',
    question_number: row.question_number || '',
    question_text: row.question_text,
    marks: row.total_marks ?? null,
    is_leaf: true,
  }
})
console.log('q0 marks', qs[0]?.marks, 'paper', qs[0]?.paper_number, qs[0]?.question_text?.slice(0, 120))

const bulk = await tagQuestions(qs, objectives, { concurrency: 1, batchSize: 2 })
console.log(
  JSON.stringify(
    {
      questionsTagged: bulk.questionsTagged,
      rejectedHallucinations: bulk.rejectedHallucinations,
      failures: bulk.failures,
      results: bulk.results.map((r) => ({
        q: r.question_number,
        tags: r.tags,
        rejected: r.rejected,
      })),
    },
    null,
    2
  )
)
