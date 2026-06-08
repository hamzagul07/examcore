#!/usr/bin/env node
/**
 * Diagnose bulk extraction damage — questions + diagrams by session, job costs.
 */
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing Supabase env')
    process.exit(1)
  }
  const sb = createClient(url, key)

  const { data: qRows, error: qErr } = await sb.rpc('exec_sql', {
    query: `
      SELECT session, COUNT(*)::int as questions,
        COUNT(CASE WHEN extraction_confidence >= 0.85 THEN 1 END)::int as high_conf,
        ROUND(AVG(extraction_confidence)::numeric, 3) as avg_conf
      FROM extracted_questions
      WHERE subject_code = '9702'
      GROUP BY session ORDER BY session
    `,
  })

  // Use raw SQL via postgrest won't work for arbitrary SQL — use supabase-js from table or pg
  // Fall back: query via multiple selects
  const { data: allQ, error: allErr } = await sb
    .from('extracted_questions')
    .select('session, extraction_confidence')
    .eq('subject_code', '9702')

  if (allErr) {
    console.error('extracted_questions:', allErr.message)
    process.exit(1)
  }

  const bySession = new Map()
  for (const row of allQ ?? []) {
    const s = row.session
    const bucket = bySession.get(s) ?? { questions: 0, high_conf: 0, confSum: 0 }
    bucket.questions++
    const c = Number(row.extraction_confidence)
    if (!Number.isNaN(c)) {
      bucket.confSum += c
      if (c >= 0.85) bucket.high_conf++
    }
    bySession.set(s, bucket)
  }

  console.log('\n=== extracted_questions by session (9702) ===')
  console.log('session | questions | high_conf | avg_conf')
  console.log('--------|-----------|-----------|----------')
  for (const [session, b] of [...bySession.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const avg = b.questions ? (b.confSum / b.questions).toFixed(3) : 'n/a'
    console.log(`${session.padEnd(7)} | ${String(b.questions).padStart(9)} | ${String(b.high_conf).padStart(9)} | ${avg}`)
  }
  console.log(`TOTAL   | ${String(allQ?.length ?? 0).padStart(9)}`)

  const { data: diagrams, error: dErr } = await sb
    .from('extracted_diagrams')
    .select('id, ai_description, question_id')

  const { data: qMeta, error: mErr } = await sb
    .from('extracted_questions')
    .select('id, session')
    .eq('subject_code', '9702')

  if (dErr || mErr) {
    console.error(dErr?.message ?? mErr?.message)
    process.exit(1)
  }

  const sessionByQ = new Map((qMeta ?? []).map((q) => [q.id, q.session]))
  const diagBySession = new Map()
  for (const d of diagrams ?? []) {
    const session = sessionByQ.get(d.question_id)
    if (!session) continue
    const b = diagBySession.get(session) ?? { diagrams_total: 0, missing_descriptions: 0 }
    b.diagrams_total++
    if (!d.ai_description) b.missing_descriptions++
    diagBySession.set(session, b)
  }

  console.log('\n=== extracted_diagrams by session (9702) ===')
  console.log('session | diagrams | missing_descriptions')
  console.log('--------|----------|---------------------')
  for (const [session, b] of [...diagBySession.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(
      `${session.padEnd(7)} | ${String(b.diagrams_total).padStart(8)} | ${String(b.missing_descriptions).padStart(19)}`
    )
  }
  if (!diagBySession.size) console.log('(no diagrams linked to 9702 questions)')

  const { data: jobs, error: jErr } = await sb
    .from('extraction_jobs')
    .select('source_pdf_path, status, cost_usd, pdf_type, retry_count')
    .like('source_pdf_path', '%9702%')

  if (jErr) {
    console.error('extraction_jobs:', jErr.message)
    process.exit(1)
  }

  const sessionFromPath = (p) => {
    const m = p.match(/\/(m\d{2}|s\d{2}|w\d{2})\//i) ?? p.match(/(m\d{2}|s\d{2}|w\d{2})/i)
    return m ? m[1].toLowerCase() : 'unknown'
  }

  const jobsBySession = new Map()
  for (const j of jobs ?? []) {
    const session = sessionFromPath(j.source_pdf_path)
    const b = jobsBySession.get(session) ?? {
      total: 0,
      completed: 0,
      pending: 0,
      failed: 0,
      running: 0,
      cost_sum: 0,
      zero_cost_completed: 0,
    }
    b.total++
    b[j.status] = (b[j.status] ?? 0) + 1
    b.cost_sum += Number(j.cost_usd) || 0
    if (j.status === 'completed' && Number(j.cost_usd) === 0) b.zero_cost_completed++
    jobsBySession.set(session, b)
  }

  console.log('\n=== extraction_jobs by session (9702 paths) ===')
  console.log('session | jobs | completed | zero$ completed | total cost')
  console.log('--------|------|-----------|-----------------|------------')
  for (const [session, b] of [...jobsBySession.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(
      `${session.padEnd(7)} | ${String(b.total).padStart(4)} | ${String(b.completed).padStart(9)} | ${String(b.zero_cost_completed).padStart(15)} | $${b.cost_sum.toFixed(2)}`
    )
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
