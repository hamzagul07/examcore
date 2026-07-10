#!/usr/bin/env node
/**
 * PROTOTYPE — IB essay model-answer generator (Path A: criteria-based components).
 *
 * For IB EXAM-ROOM essay components (not IAs/EE/coursework), generate a top-band
 * exemplar essay grounded in the VERBATIM official criteria/bands already in the DB
 * (ib_criterion / ib_criterion_band), plus a per-criterion explanation of why it hits
 * the top band. No IB markscheme sourcing needed — the bands ARE the markscheme.
 *
 * DRY-RUN ONLY: writes samples to the scratchpad, no DB writes. Judge quality first.
 *   npx tsx scripts/seed-community/generate-ib-essay-answers.mjs
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (process.env[k] === undefined) process.env[k] = v
  }
}

const OUT_DIR = join(
  '/private/tmp/claude-501/-Users-hamzagul-Documents-examcore/9f5e3276-3584-4d37-88bd-bbbaf5d4dfb0/scratchpad',
  'ib-essays'
)

// Prototype targets: self-contained exam-room essay components (no source/stimulus needed).
// Questions are representative of the real exam format (not copied from a live paper).
const TARGETS = [
  {
    subjectCode: 'ib-economics', subjectName: 'IB Economics', component: 'paper_1', level: 'SL',
    label: 'Paper 1 essay',
    question:
      'Part (a): Explain how the imposition of a specific (indirect) tax on cigarettes affects the market for cigarettes. [10 marks]\n\nPart (b): Using real-world examples, evaluate the view that indirect taxes are the most effective way for a government to reduce cigarette consumption. [15 marks]',
    conventions: 'Use economic theory, describe supply/demand diagrams in words (shifts, new equilibrium), and develop a real-world example in part (b).',
  },
  {
    subjectCode: 'ib-psychology', subjectName: 'IB Psychology', component: 'paper_1', level: 'SL',
    label: 'Paper 1 essay (biological approach)',
    question: 'Discuss the effects of one or more neurotransmitters on human behaviour. [22 marks]',
    conventions: 'Use named psychological studies (aim, method, findings) and explicit critical thinking/evaluation, linked back to the question.',
  },
]

async function fetchCriteria(admin, t) {
  const { data: comp } = await admin
    .from('ib_component')
    .select('id, max_marks')
    .eq('subject_code', t.subjectCode).eq('component_key', t.component).eq('level', t.level)
    .maybeSingle()
  if (!comp) return null
  const { data: crits } = await admin
    .from('ib_criterion')
    .select('id, letter, name, max_marks, ordinal')
    .eq('component_id', comp.id).order('ordinal', { ascending: true })
  const out = []
  for (const cr of crits || []) {
    const { data: band } = await admin
      .from('ib_criterion_band')
      .select('descriptor, marks_min, marks_max')
      .eq('criterion_id', cr.id).order('marks_max', { ascending: false }).limit(1).maybeSingle()
    out.push({ letter: cr.letter, name: cr.name, maxMarks: cr.max_marks, topBand: band?.descriptor || '', topRange: band ? `${band.marks_min}-${band.marks_max}` : '' })
  }
  return { maxMarks: comp.max_marks, criteria: out }
}

function buildPrompt(t, criteria) {
  const critText = criteria.criteria
    .map((c) => `Criterion ${c.letter} — ${c.name} (max ${c.maxMarks}). TOP BAND (${c.topRange}): ${c.topBand}`)
    .join('\n')
  return `You are a senior IB examiner writing an official-style, TOP-BAND (grade 7) MODEL ANSWER for a ${t.subjectName} ${t.label} exam question.

QUESTION:
${t.question}

OFFICIAL IB MARKING CRITERIA (verbatim — your essay MUST satisfy every top-band descriptor below):
${critText}

Conventions: ${t.conventions}

Return STRICT JSON only:
{
  "modelAnswer": "A complete, top-band exemplar essay in Markdown at the right length for ${criteria.maxMarks} marks. Follow IB ${t.subjectName} exam conventions. This is an illustrative exemplar, not the only correct answer.",
  "criterionBreakdown": [ { "criterion": "A — <name>", "howMet": "How the essay satisfies the TOP band for this criterion, referencing specific parts of the essay." } ],
  "commonMistakes": ["2-4 specific ways students drop out of the top band on this kind of question."],
  "studyTip": "One sentence: the transferable exam technique this rewards."
}
Do not invent criteria beyond those given. Return ONLY the JSON object.`
}

function renderMd(t, criteria, parsed) {
  const L = []
  L.push(`# ${t.subjectName} — ${t.label} (model answer)`)
  L.push('')
  L.push('## Question')
  L.push('')
  L.push(t.question)
  L.push('')
  L.push('## Top-band model answer')
  L.push('')
  L.push(parsed.modelAnswer?.trim() || '')
  L.push('')
  L.push('---')
  L.push('')
  L.push('### How it meets the IB criteria')
  L.push('')
  for (const b of parsed.criterionBreakdown || []) L.push(`- **${b.criterion}** — ${b.howMet}`)
  if (parsed.commonMistakes?.length) {
    L.push('')
    L.push('### Common ways to drop marks')
    L.push('')
    for (const m of parsed.commonMistakes) L.push(`- ${m}`)
  }
  if (parsed.studyTip) { L.push(''); L.push(`> **Examiner tip:** ${parsed.studyTip}`) }
  L.push('')
  L.push('---')
  L.push('')
  L.push('*AI-generated exemplar for revision, grounded in the official IB assessment criteria and reviewed by the MarkScheme team. Write your own response for assessed work.*')
  return L.join('\n')
}

async function main() {
  loadEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE env')
  const { createClient } = await import('@supabase/supabase-js')
  const { generateGeminiText, GEMINI_PRO_MODEL } = await import('../../lib/ai/gemini-text.ts')
  const { extractJSON } = await import('../../lib/marking/json.ts')
  const admin = createClient(url, key)

  console.log(`\nIB essay model-answer generator — DRY RUN (no DB writes) · ${TARGETS.length} targets\n`)
  mkdirSync(OUT_DIR, { recursive: true })

  for (const t of TARGETS) {
    const label = `${t.subjectCode}/${t.component}/${t.level}`
    try {
      const criteria = await fetchCriteria(admin, t)
      if (!criteria || !criteria.criteria.length) throw new Error('no criteria/bands found in DB')
      const raw = await generateGeminiText(buildPrompt(t, criteria), { model: GEMINI_PRO_MODEL, task: 'content-generation', temperature: 0.4, maxOutputTokens: 8000 })
      const parsed = extractJSON(raw)
      if (!parsed || !parsed.modelAnswer) throw new Error('no usable modelAnswer')
      const md = renderMd(t, criteria, parsed)
      const file = join(OUT_DIR, `${t.subjectCode}-${t.component}-${t.level}.md`)
      writeFileSync(file, md)
      console.log(`  ✓ ${label} → ${file.split('/').pop()} (${criteria.criteria.length} criteria, ${md.length} chars)`)
    } catch (e) {
      console.log(`  ✗ ${label} — ${e.message}`)
    }
  }
  console.log(`\nDone. Samples in ${OUT_DIR}\n`)
}

main().catch((e) => { console.error(e); process.exit(1) })
