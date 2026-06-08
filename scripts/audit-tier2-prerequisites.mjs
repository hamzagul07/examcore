#!/usr/bin/env node
/**
 * Phase 0 — Tier 2 prerequisite audit (syllabus PDFs + Supabase paper coverage).
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, statSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const TIER2 = ['9709', '9618', '9706', '9708']
const SESSIONS = [
  'm20', 's20', 'w20', 'm21', 's21', 'w21', 'm22', 's22', 'w22',
  'm23', 's23', 'w23', 'm24', 'w24', 'm25', 's25', 'w25',
]

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

loadEnv()

const syllabiDir = join(ROOT, 'syllabi-source')
console.log('=== Syllabus PDFs (syllabi-source/) ===')
const syllabusStatus = {}
for (const code of TIER2) {
  const path = join(syllabiDir, `${code}.pdf`)
  if (!existsSync(path)) {
    syllabusStatus[code] = { ok: false, reason: 'missing' }
    console.log(`  ${code}: MISSING`)
    continue
  }
  const size = statSync(path).size
  syllabusStatus[code] = { ok: true, bytes: size }
  console.log(`  ${code}: OK (${Math.round(size / 1024)} KB)`)
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\nSupabase env missing — cannot audit paper-pdfs storage.')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('\n=== Past paper PDFs (paper-pdfs/cambridge/) ===')
const paperStatus = {}
for (const code of TIER2) {
  let qp = 0
  let ms = 0
  let sessionsWithQp = 0
  const gaps = []

  for (const session of SESSIONS) {
    const prefix = `cambridge/${code}/${session}`
    const { data, error } = await supabase.storage.from('paper-pdfs').list(prefix, {
      limit: 200,
    })
    if (error) {
      gaps.push(`${session}:list-error`)
      continue
    }
    const qps = (data ?? []).filter((f) => /^qp_/i.test(f.name)).length
    const mss = (data ?? []).filter((f) => /^ms_/i.test(f.name)).length
    qp += qps
    ms += mss
    if (qps > 0) sessionsWithQp++
    else gaps.push(session)
  }

  paperStatus[code] = { qp, ms, sessionsWithQp, gaps }
  console.log(
    `  ${code}: ${qp} QPs, ${ms} MSs, ${sessionsWithQp}/${SESSIONS.length} sessions with QPs` +
      (gaps.length ? ` (gaps: ${gaps.slice(0, 5).join(', ')}${gaps.length > 5 ? '…' : ''})` : '')
  )
}

const missingSyllabi = TIER2.filter((c) => !syllabusStatus[c]?.ok)
const noPapers = TIER2.filter((c) => paperStatus[c]?.qp === 0)

console.log('\n=== Summary ===')
if (missingSyllabi.length) {
  console.log(`BLOCKER: missing syllabus PDFs: ${missingSyllabi.join(', ')}`)
}
if (noPapers.length) {
  console.log(`BLOCKER: no question papers in storage: ${noPapers.join(', ')}`)
}
if (!missingSyllabi.length && !noPapers.length) {
  console.log('All Tier 2 prerequisites look OK for syllabus extraction.')
}

const outPath = join(ROOT, 'docs', 'extraction', 'tier2-prerequisites.md')
import { mkdirSync, writeFileSync } from 'fs'
mkdirSync(dirname(outPath), { recursive: true })
const lines = [
  '# Tier 2 prerequisites audit',
  '',
  `**Generated:** ${new Date().toISOString()}`,
  '',
  '## Syllabus PDFs',
  '',
  ...TIER2.map((c) => {
    const s = syllabusStatus[c]
    return s?.ok
      ? `- **${c}**: OK (${Math.round(s.bytes / 1024)} KB)`
      : `- **${c}**: **MISSING** — download from Cambridge International`
  }),
  '',
  '## Past paper coverage',
  '',
  ...TIER2.map((c) => {
    const p = paperStatus[c]
    return `- **${c}**: ${p.qp} QPs, ${p.ms} MSs, ${p.sessionsWithQp}/${SESSIONS.length} sessions`
  }),
  '',
  '## Blockers',
  '',
]
if (missingSyllabi.length || noPapers.length) {
  if (missingSyllabi.length) lines.push(`- Missing syllabi: ${missingSyllabi.join(', ')}`)
  if (noPapers.length) lines.push(`- No papers in storage: ${noPapers.join(', ')}`)
} else {
  lines.push('None — ready for Phase 1 syllabus extraction.')
}
lines.push('', '## Connection pool', '', 'Verify manually in Supabase Dashboard → Database → Connection Pooling (target 40–60 for 16 concurrent extractions).')
writeFileSync(outPath, lines.join('\n'))
console.log(`\nWrote ${outPath}`)

if (missingSyllabi.length || noPapers.length) process.exit(2)
