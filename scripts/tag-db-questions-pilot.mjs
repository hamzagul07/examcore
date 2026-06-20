#!/usr/bin/env node
/**
 * Pilot: topic-tag mark_schemes questions straight from the DB and write
 * lesson-grain topic_codes into mark_schemes.syllabus_tags (what the
 * /past-papers/[code]/[topic] pages query via fetchPastPaperQuestionsForTopic).
 *
 * Reuses the audited tagger core (tagQuestions). Self-contained persistence
 * (writes topic_code grain) — does not touch the question_topic_tags table.
 *
 * Usage:
 *   node --import tsx scripts/tag-db-questions-pilot.mjs --subject=9702 --limit=32   # dry sample
 *   node --import tsx scripts/tag-db-questions-pilot.mjs --subject=9702 --persist     # full run
 */
import { readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

// Default to the direct GEMINI_API_KEY path (free, but a hard DAILY cap). Pass
// --vertex to use Vertex instead (draws on Cloud credits, NO daily cap — only a
// per-minute rate quota that the write/read retries + low concurrency smooth over).
// Must be set before the env loader so it isn't overridden by .env.local.
if (!process.argv.includes('--vertex')) process.env.USE_VERTEX_AI = 'false'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const t = line.trim(); if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('='); if (eq < 0) continue
  const k = t.slice(0, eq).trim(); let v = t.slice(eq + 1).trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  if (process.env[k] === undefined) process.env[k] = v
}

const args = process.argv.slice(2)
const SUBJECT = (args.find((a) => a.startsWith('--subject=')) || '--subject=9702').split('=')[1]
const LIMIT = Number((args.find((a) => a.startsWith('--limit=')) || '--limit=0').split('=')[1]) || 0
const PERSIST = args.includes('--persist')
const MIN_CONF = 0.45

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { loadSyllabusObjectivesFromJson, tagQuestions } = await import('../lib/extraction/topic-tagger.ts')

function sessionFromName(name) {
  const ym = (name || '').match(/(\d{4})/)
  const year = ym ? Number(ym[1]) : 2024
  const lower = (name || '').toLowerCase()
  const letter = lower.includes('may') ? 's' : lower.includes('october') ? 'w' : lower.includes('february') ? 'm' : 's'
  return { year, session: `${letter}${String(year).slice(-2)}` }
}

function toTaggingQuestion(row) {
  const comp = (row.paper_code || '').split('/')[1] || ''
  const { year, session } = sessionFromName(row.paper_session)
  return {
    id: row.id,
    subject_code: SUBJECT,
    paper_number: comp[0] || '',
    variant: comp.slice(1) || '0',
    year,
    session,
    question_number: row.question_number || '',
    question_text: row.question_text,
    marks: row.total_marks ?? null,
    is_leaf: true,
  }
}

// ---- load questions needing tags ----
const rows = []
const PAGE = 1000
for (let from = 0; ; from += PAGE) {
  let q = sb.from('mark_schemes')
    .select('id,paper_code,paper_session,question_number,question_text,total_marks,syllabus_tags')
    .like('paper_code', `${SUBJECT}%`)
    .not('question_text', 'is', null)
    .eq('syllabus_tags', '{}')
    .range(from, from + PAGE - 1)
  const { data, error } = await q
  if (error) { console.error('query error', error.message); process.exit(1) }
  rows.push(...(data || []))
  if (!data || data.length < PAGE) break
}
const pending = (LIMIT ? rows.slice(0, LIMIT) : rows)
console.log(`${SUBJECT}: ${rows.length} untagged questions; processing ${pending.length}${PERSIST ? ' (PERSIST)' : ' (dry)'}`)

const objectives = loadSyllabusObjectivesFromJson(ROOT, SUBJECT)
const objByNum = new Map(objectives.map((o) => [o.objective_number, o]))
const questions = pending.map(toTaggingQuestion)

const CONC = Number((args.find((a) => a.startsWith('--concurrency=')) || '--concurrency=1').split('=')[1]) || 1
const CHUNK = 40 // tag + persist incrementally so a kill/crash never loses more than one chunk

const byId = new Map(pending.map((r) => [r.id, r]))
let processed = 0
let tagged = 0
let wrote = 0
const auditSample = []

for (let i = 0; i < questions.length; i += CHUNK) {
  const slice = questions.slice(i, i + CHUNK)
  const bulk = await tagQuestions(slice, objectives, { concurrency: CONC, batchSize: 8 })
  for (const res of bulk.results) {
    const codes = [...new Set(res.tags.filter((t) => t.confidence >= MIN_CONF).map((t) => t.topic_code).filter(Boolean))]
    if (!codes.length) continue
    tagged++
    if (auditSample.length < 20) {
      const r = byId.get(res.question_id)
      auditSample.push({
        q: (r?.question_text || '').slice(0, 90),
        tags: codes.map((c) => `${c} (${objectives.find((o) => o.topic_code === c)?.topic_title || '?'})`),
      })
    }
    if (PERSIST) {
      // Retry transient network/DNS blips (EAI_AGAIN / fetch failed) on the write.
      let ok = false
      for (let a = 0; a < 5 && !ok; a++) {
        const { data: updRows, error } = await sb
          .from('mark_schemes')
          .update({ syllabus_tags: codes })
          .eq('id', res.question_id)
          .select('id')
        if (!error && updRows?.length) ok = true
        else await new Promise((r) => setTimeout(r, 600 * (a + 1)))
      }
      if (ok) wrote++
      else console.error('PERSIST FAILED after retries for', res.question_id)
    }
  }
  processed += slice.length
  console.log(`  [${processed}/${questions.length}] tagged ${tagged}, persisted ${wrote}`)
}

console.log(`\n=== AUDIT SAMPLE (eyeball topic vs question) ===`)
for (const a of auditSample) console.log(`\n  Q: ${a.q}\n  -> ${a.tags.join(' | ')}`)
console.log(`\nProcessed ${processed} | tagged ${tagged} | ${PERSIST ? `persisted ${wrote} rows` : 'DRY (no writes)'}`)
