#!/usr/bin/env node
/**
 * Phase 0 (Prompt B v3) — evidence richness audit across (paper, topic) tuples.
 *
 * Usage: npx tsx scripts/evidence-audit.mjs [--subject=9702]
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PAPERS = ['1', '2', '3', '4', '5']

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

function parseArgs() {
  let subject = '9702'
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--subject=')) subject = arg.slice('--subject='.length)
  }
  return { subject }
}

function topicSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true })
}

async function main() {
  loadEnv()
  const { subject } = parseArgs()

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase env required')
    process.exit(1)
  }

  const { createAdminClient } = await import('../lib/supabase-admin.ts')
  const { getLessonEvidence } = await import('../lib/courses/content-source.ts')

  const supabase = createAdminClient()

  const { data: topicRows, error } = await supabase
    .from('syllabus_objectives')
    .select('topic_code, topic_title, examined_in_papers')
    .eq('subject_code', subject)
    .order('topic_code')

  if (error) throw new Error(error.message)

  const topicMeta = new Map()
  for (const row of topicRows ?? []) {
    if (!topicMeta.has(row.topic_code)) {
      topicMeta.set(row.topic_code, {
        topic_code: row.topic_code,
        topic_title: row.topic_title,
        examined_in_papers: new Set(),
      })
    }
    for (const p of row.examined_in_papers ?? []) {
      topicMeta.get(row.topic_code).examined_in_papers.add(p)
    }
  }

  const topics = [...topicMeta.values()].sort((a, b) => topicSort(a.topic_code, b.topic_code))

  const matrix = []
  let wellCovered = 0
  let sparse = 0
  let zeroQuestions = 0
  let gapsOnExaminedPaper = 0
  let totalExpectedLessons = 0

  for (const paper of PAPERS) {
    for (const topic of topics) {
      const evidence = await getLessonEvidence(subject, paper, topic.topic_code, { supabase })
      const row = {
        paper,
        topic_code: topic.topic_code,
        topic_title: topic.topic_title,
        objectives: evidence.objectives.length,
        questions: evidence.questions.length,
        markPoints: evidence.markSchemes.length,
        examinedOnPaper: topic.examined_in_papers.has(paper),
      }
      matrix.push(row)

      if (row.objectives > 0) totalExpectedLessons++

      if (row.questions >= 3) wellCovered++
      else if (row.questions >= 1) sparse++
      else zeroQuestions++

      if (row.examinedOnPaper && row.objectives > 0 && row.questions === 0) {
        gapsOnExaminedPaper++
      }
    }
  }

  const pilotCandidates = matrix
    .filter((r) => r.questions >= 3)
    .sort((a, b) => b.questions - a.questions)
    .slice(0, 30)

  const gaps = matrix.filter((r) => r.examinedOnPaper && r.objectives > 0 && r.questions === 0)

  const pilotTuples = [
    ['1', '3.1', 'Momentum MCQ'],
    ['2', '7.2', 'Waves AS structured'],
    ['3', '1.3', 'Practical skills'],
    ['4', '14.3', 'Specific heat capacity'],
    ['4', '25.3', 'Cosmology'],
    ['5', '1.3', 'Planning (1.3 fallback)'],
  ]

  const pilotEvidence = []
  for (const [paper, topic, label] of pilotTuples) {
    const e = await getLessonEvidence(subject, paper, topic, { supabase })
    pilotEvidence.push({
      label,
      paper,
      topic,
      objectives: e.objectives.length,
      questions: e.questions.length,
      marks: e.markSchemes.length,
      ready: e.questions.length >= 3,
    })
  }

  const { count: qCount } = await supabase
    .from('extracted_questions')
    .select('*', { count: 'exact', head: true })
    .eq('subject_code', subject)

  const { data: sessions } = await supabase
    .from('extracted_questions')
    .select('year, session, paper_number')
    .eq('subject_code', subject)

  const sessionSet = new Set((sessions ?? []).map((s) => `${s.year} ${s.session}`))

  const lines = [
    `# Evidence richness audit — ${subject}`,
    '',
    `**Generated:** ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- Syllabus topics: **${topics.length}**`,
    `- (paper × topic) cells audited: **${matrix.length}** (${PAPERS.length} papers)`,
    `- Cells with syllabus objectives for that paper: **${totalExpectedLessons}** (expected paper-scoped lesson count at full rollout)`,
    `- Well-covered (≥3 questions): **${wellCovered}**`,
    `- Sparse (1–2 questions): **${sparse}**`,
    `- Zero questions: **${zeroQuestions}**`,
    `- Gaps (examined on paper, objectives present, 0 questions): **${gapsOnExaminedPaper}**`,
    `- Total extracted questions in DB: **${qCount ?? 0}**`,
    `- Sessions in DB: ${[...sessionSet].sort().join(', ') || '(none)'}`,
    '',
    '## Decision gate',
    '',
  ]

  const pctWell = wellCovered / Math.max(totalExpectedLessons, 1)
  if (pctWell >= 0.5 && gapsOnExaminedPaper < totalExpectedLessons * 0.3) {
    lines.push(
      '**Recommendation: proceed with full paper-scoping** — majority of examined tuples have usable evidence or will fill as bulk extraction completes.'
    )
  } else if (gapsOnExaminedPaper > totalExpectedLessons * 0.5) {
    lines.push(
      '**Recommendation: hold bulk generation** — too many examined tuples lack past-paper questions. Consider completing bulk extraction (Phase 11) first, or AS/A-Level combined scoping for sparse papers.'
    )
  } else {
    lines.push(
      '**Recommendation: pilot-first with paper-scoping** — mixed coverage; generate pilots only for well-covered tuples until more sessions land.'
    )
  }

  lines.push('', '## Phase 5 pilot tuple readiness', '', '| Pilot | Paper | Topic | Objectives | Questions | Marks | Ready (≥3)? |', '|-------|-------|-------|------------|-----------|-------|-------------|')
  for (const p of pilotEvidence) {
    lines.push(
      `| ${p.label} | ${p.paper} | ${p.topic} | ${p.objectives} | ${p.questions} | ${p.marks} | ${p.ready ? '✓' : '✗ swap topic'} |`
    )
  }

  lines.push('', '## Top pilot candidates (≥3 questions)', '', '| Paper | Topic | Title | Q | Marks | Obj |', '|-------|-------|-------|---|-------|-----|')
  for (const r of pilotCandidates) {
    const t = topicMeta.get(r.topic_code)
    lines.push(
      `| ${r.paper} | ${r.topic_code} | ${t?.topic_title ?? ''} | ${r.questions} | ${r.markPoints} | ${r.objectives} |`
    )
  }

  lines.push('', '## Examined-paper gaps (0 questions)', '', '| Paper | Topic | Title | Objectives |', '|-------|-------|-------|------------|')
  for (const r of gaps.sort((a, b) => topicSort(a.topic_code, b.topic_code) || a.paper.localeCompare(b.paper))) {
    lines.push(`| ${r.paper} | ${r.topic_code} | ${r.topic_title} | ${r.objectives} |`)
  }

  lines.push('', '## Full matrix (paper × topic)', '', '| Paper | Topic | Examined? | Obj | Q | Marks |', '|-------|-------|-----------|-----|---|-------|')
  for (const r of matrix.sort((a, b) => a.paper.localeCompare(b.paper) || topicSort(a.topic_code, b.topic_code))) {
    if (r.objectives === 0 && r.questions === 0) continue
    lines.push(
      `| ${r.paper} | ${r.topic_code} | ${r.examinedOnPaper ? 'yes' : 'no'} | ${r.objectives} | ${r.questions} | ${r.markPoints} |`
    )
  }

  const outDir = join(ROOT, 'docs', 'content-generation')
  mkdirSync(outDir, { recursive: true })
  const outPath = join(outDir, 'evidence-audit.md')
  writeFileSync(outPath, lines.join('\n'))
  console.log(`Wrote ${outPath}`)
  console.log(`Topics: ${topics.length}, well-covered cells: ${wellCovered}, gaps: ${gapsOnExaminedPaper}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
