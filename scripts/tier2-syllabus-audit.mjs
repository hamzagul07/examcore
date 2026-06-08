#!/usr/bin/env node
/**
 * Build docs/extraction/tier2-syllabus-audit.md from extraction-output JSON + optional DB.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const TIER2 = ['9709', '9618', '9706', '9708']
const MATH_STREAM_PAPERS = {
  '1': 'Pure Mathematics 1',
  '3': 'Pure Mathematics 3',
  '4': 'Mechanics',
  '5': 'Probability & Statistics 1',
  '6': 'Probability & Statistics 2',
}

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

function loadJson(subjectCode) {
  const path = join(ROOT, 'scripts', 'extraction-output', `syllabus_${subjectCode}.json`)
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf8'))
}

function audit9709Streams(objectives) {
  const issues = []
  const samples = []
  for (const o of objectives) {
    const papers = o.examined_in_papers ?? []
    if (o.objective_number.startsWith('1.') && papers.includes('4')) {
      issues.push(`${o.objective_number} Pure topic tagged with Mechanics paper 4`)
    }
    if (papers.length) {
      samples.push({
        objective_number: o.objective_number,
        examined_in_papers: papers,
        text: o.objective_text?.slice(0, 80),
      })
    }
  }
  return {
    issues: issues.slice(0, 20),
    spotSamples: samples.sort(() => Math.random() - 0.5).slice(0, 5),
  }
}

loadEnv()

const lines = [
  '# Tier 2 syllabus audit',
  '',
  `**Generated:** ${new Date().toISOString()}`,
  '',
]

let dbCounts = {}
if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  for (const code of TIER2) {
    const { count } = await supabase
      .from('syllabus_objectives')
      .select('*', { count: 'exact', head: true })
      .eq('subject_code', code)
    dbCounts[code] = count ?? 0
  }
}

for (const code of TIER2) {
  const pdfPath = join(ROOT, 'syllabi-source', `${code}.pdf`)
  const json = loadJson(code)
  lines.push(`## ${code}`, '')

  if (!existsSync(pdfPath)) {
    lines.push('- **Status:** BLOCKED — `syllabi-source/' + code + '.pdf` missing')
    if (code === '9709') {
      lines.push(
        '- Note: coarse topic map exists in `lib/syllabus.ts` (38 topics) but fine-grain objectives for tagging require the Cambridge PDF.'
      )
    }
    lines.push('')
    continue
  }

  if (!json) {
    lines.push('- **Status:** PDF present, extraction not run yet')
    lines.push(`- DB rows: ${dbCounts[code] ?? 'n/a'}`)
    lines.push('')
    continue
  }

  const v = json.validation ?? {}
  const summary = json.summary ?? {}
  lines.push(`- **Objectives extracted:** ${summary.objectiveCount ?? json.objectives?.length ?? 0}`)
  lines.push(`- **Topics with objectives:** ${summary.topicsWithObjectives ?? v.topicsWithObjectives ?? '?'}`)
  lines.push(`- **Validation pass:** ${summary.validationPass ?? v.pass ?? '?'}`)
  lines.push(`- **DB rows:** ${dbCounts[code] ?? 'n/a'}`)
  lines.push(`- **Duplicates:** ${(v.duplicateObjectiveNumbers ?? []).length}`)
  lines.push(`- **Empty text:** ${v.emptyTextCount ?? 0}`)
  lines.push(`- **Missing examined_in_papers:** ${v.missingPapersCount ?? 0}`)

  if (v.messages?.length) {
    lines.push('- **Validation messages:**')
    for (const m of v.messages.slice(0, 5)) lines.push(`  - ${m}`)
  }

  if (code === '9709' && json.objectives?.length) {
    const streamAudit = audit9709Streams(json.objectives)
    lines.push('', '### 9709 stream spot-check (5 random objectives)', '')
    for (const s of streamAudit.spotSamples) {
      lines.push(
        `- \`${s.objective_number}\` papers=[${s.examined_in_papers.join(',')}] — ${s.text}`
      )
    }
    if (streamAudit.issues.length) {
      lines.push('', '### Stream mapping issues', '')
      for (const i of streamAudit.issues) lines.push(`- ${i}`)
    }
    lines.push('', '**Paper streams:**', '')
    for (const [p, label] of Object.entries(MATH_STREAM_PAPERS)) {
      lines.push(`- Paper ${p}: ${label}`)
    }
  }

  lines.push('')
}

lines.push('## Next steps', '')
lines.push('1. Add missing `9709.pdf` before Mathematics syllabus extraction.')
lines.push('2. Hassan reviews this audit before s24 pilot extractions.')
lines.push('3. Run pilots: `pnpm bulk:extract --subjects=<code> --sessions=s24 --concurrency=4` per subject.')

const outDir = join(ROOT, 'docs', 'extraction')
mkdirSync(outDir, { recursive: true })
const outPath = join(outDir, 'tier2-syllabus-audit.md')
writeFileSync(outPath, lines.join('\n'))
console.log(`Wrote ${outPath}`)
