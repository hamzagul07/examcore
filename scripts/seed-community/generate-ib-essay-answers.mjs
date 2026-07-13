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
const ECON_CONV = 'Use economic theory, describe supply/demand or cost/revenue diagrams in words (curves, shifts, new equilibrium), and develop a specific real-world example in part (b).'
const PSYCH_CONV = 'Use named psychological studies (aim, method, findings) and explicit critical thinking/evaluation, linked back to the question throughout.'

// Representative exam-style questions (standard IB formats — NOT copied from live papers).
const TARGETS = [
  // ---- IB Economics Paper 1 (Part a 10 + Part b 15) ----
  { subjectCode: 'ib-economics', subjectName: 'IB Economics', component: 'paper_1', level: 'SL', label: 'Paper 1 — indirect taxes',
    question: 'Part (a): Explain how the imposition of a specific (indirect) tax on cigarettes affects the market for cigarettes. [10 marks]\n\nPart (b): Using real-world examples, evaluate the view that indirect taxes are the most effective way for a government to reduce cigarette consumption. [15 marks]', conventions: ECON_CONV },
  { subjectCode: 'ib-economics', subjectName: 'IB Economics', component: 'paper_1', level: 'SL', label: 'Paper 1 — subsidies',
    question: 'Part (a): Explain how a government subsidy granted to producers of solar panels affects the market for solar panels. [10 marks]\n\nPart (b): Using real-world examples, evaluate the view that subsidies are the best way to increase the consumption of merit goods. [15 marks]', conventions: ECON_CONV },
  { subjectCode: 'ib-economics', subjectName: 'IB Economics', component: 'paper_1', level: 'SL', label: 'Paper 1 — monopoly',
    question: 'Part (a): Explain why a firm operating in a monopoly may be able to earn abnormal profit in the long run. [10 marks]\n\nPart (b): Using real-world examples, evaluate the view that monopoly is always against the interest of consumers. [15 marks]', conventions: ECON_CONV },
  { subjectCode: 'ib-economics', subjectName: 'IB Economics', component: 'paper_1', level: 'SL', label: 'Paper 1 — exchange rates',
    question: 'Part (a): Explain how a depreciation of a country’s currency might affect its balance of trade. [10 marks]\n\nPart (b): Using real-world examples, evaluate the view that a depreciation of the exchange rate is beneficial for an economy. [15 marks]', conventions: ECON_CONV },
  { subjectCode: 'ib-economics', subjectName: 'IB Economics', component: 'paper_1', level: 'SL', label: 'Paper 1 — fiscal policy',
    question: 'Part (a): Explain how expansionary fiscal policy could be used to increase real GDP. [10 marks]\n\nPart (b): Using real-world examples, evaluate the view that fiscal policy is more effective than monetary policy in promoting economic growth. [15 marks]', conventions: ECON_CONV },

  // ---- IB Psychology Paper 1 essay (22 marks, criteria A–E) ----
  { subjectCode: 'ib-psychology', subjectName: 'IB Psychology', component: 'paper_1', level: 'SL', label: 'Paper 1 — neurotransmitters',
    question: 'Discuss the effects of one or more neurotransmitters on human behaviour. [22 marks]', conventions: PSYCH_CONV },
  { subjectCode: 'ib-psychology', subjectName: 'IB Psychology', component: 'paper_1', level: 'SL', label: 'Paper 1 — localization',
    question: 'Discuss localization of function in the brain, with reference to one or more studies. [22 marks]', conventions: PSYCH_CONV },
  { subjectCode: 'ib-psychology', subjectName: 'IB Psychology', component: 'paper_1', level: 'SL', label: 'Paper 1 — hormones',
    question: 'Discuss the effect of one hormone on human behaviour. [22 marks]', conventions: PSYCH_CONV },
  { subjectCode: 'ib-psychology', subjectName: 'IB Psychology', component: 'paper_1', level: 'SL', label: 'Paper 1 — schema theory',
    question: 'Evaluate schema theory, with reference to one or more studies. [22 marks]', conventions: PSYCH_CONV },
  { subjectCode: 'ib-psychology', subjectName: 'IB Psychology', component: 'paper_1', level: 'SL', label: 'Paper 1 — social identity theory',
    question: 'Discuss social identity theory, with reference to one or more studies. [22 marks]', conventions: PSYCH_CONV },
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

const DRY = !process.argv.slice(2).includes('--run')

// IB assessment-catalog code -> community ROOM subject_code (rooms use a level suffix).
const ROOM_CODE = { 'ib-economics': 'economics-hl', 'ib-psychology': 'psychology-hl' }

const BOT = {
  id: 'a1000004-0000-4000-8000-000000000004',
  email: 'model-answers-seed@examcore.internal',
  username: 'markscheme_answers',
  name: 'MarkScheme Model Answers',
}

// Deterministic IDs (distinct tags from the Cambridge generator's c0de0001/2).
function seededUuid(kind, key) {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  const hex = (h.toString(16) + '00000000').slice(0, 8)
  const tag = kind === 'q' ? 'c0de0003' : 'c0de0004'
  return `${hex}-0000-4000-8000-0000${tag}`.slice(0, 36)
}

// Convert diagram image markdown (![...](...) or ![...]) to a plain-text note (no broken images).
function diagramToText(md) {
  const toNote = (_m, alt) => `\n> **Diagram:** ${(alt || '').replace(/^Diagram Description:\s*/i, '').trim()}\n`
  return (md || '').replace(/!\[([^\]]*)\]\([^)]*\)/g, toNote).replace(/!\[([^\]]*)\]/g, toNote)
}

function questionTitle(t) {
  const clause = (t.question.match(/(?:Evaluate|Discuss)[^\[\n]*/gi) || []).pop() || t.question.split('\n')[0]
  return `${t.subjectName} Paper 1: ${clause.trim()}`.replace(/\s+/g, ' ').slice(0, 155)
}

function questionBodyMd(t) {
  return `**${t.subjectName} · ${t.label} · exam essay**\n\n${t.question.trim()}\n\n_A top-band (grade 7) model answer with a criterion-by-criterion breakdown is below._`
}

function answerBodyMd(t, parsed) {
  const L = [diagramToText(parsed.modelAnswer?.trim() || ''), '', '---', '', '### How it meets the IB criteria', '']
  for (const b of parsed.criterionBreakdown || []) L.push(`- **${b.criterion}** — ${b.howMet}`)
  if (parsed.commonMistakes?.length) {
    L.push('', '### Common ways to drop marks', '')
    for (const m of parsed.commonMistakes) L.push(`- ${m}`)
  }
  if (parsed.studyTip) L.push('', `> **Examiner tip:** ${parsed.studyTip}`)
  L.push('', '---', '', '*AI-generated exemplar for revision, grounded in the official IB assessment criteria and reviewed by the MarkScheme team. Write your own response for assessed work. [Mark your own answer →](/mark)*')
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

  console.log(`\nIB essay model-answer generator — ${DRY ? 'DRY RUN (no DB writes)' : 'LIVE RUN (INSERTING)'} · ${TARGETS.length} targets\n`)
  if (DRY) mkdirSync(OUT_DIR, { recursive: true })

  if (!DRY) {
    const { data: existing } = await admin.auth.admin.getUserById(BOT.id)
    if (!existing?.user) {
      await admin.auth.admin.createUser({ id: BOT.id, email: BOT.email, email_confirm: true, password: `seed-${BOT.id.slice(0, 8)}-disabled`, user_metadata: { username: BOT.username } })
    }
    await admin.from('user_profiles').upsert({ id: BOT.id, username: BOT.username, full_name: BOT.name, onboarded: true, onboarding_completed: true, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  }

  let ok = 0, fail = 0
  for (const t of TARGETS) {
    const lbl = `${t.subjectCode}/${t.label}`
    try {
      const criteria = await fetchCriteria(admin, t)
      if (!criteria || !criteria.criteria.length) throw new Error('no criteria/bands found in DB')
      const raw = await generateGeminiText(buildPrompt(t, criteria), { model: GEMINI_PRO_MODEL, task: 'content-generation', temperature: 0.4, maxOutputTokens: 8000 })
      const parsed = extractJSON(raw)
      if (!parsed || !parsed.modelAnswer) throw new Error('no usable modelAnswer')
      if ((parsed.criterionBreakdown || []).length < 1 || parsed.modelAnswer.trim().length < 800) throw new Error('quality gate (thin essay)')

      if (DRY) {
        const slug = t.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        const file = join(OUT_DIR, `${t.subjectCode}-${slug}.md`)
        writeFileSync(file, renderMd(t, criteria, parsed))
        console.log(`  ✓ ${lbl} → ${file.split('/').pop()}`)
      } else {
        const roomCode = ROOM_CODE[t.subjectCode]
        if (!roomCode) throw new Error(`no room-code map for ${t.subjectCode}`)
        const key = `${t.subjectCode}|${t.component}|${t.level}|${t.label}`
        const qId = seededUuid('q', key), aId = seededUuid('a', key)
        const { error: qErr } = await admin.from('community_questions').upsert({ id: qId, author_id: BOT.id, board: 'ib', subject_code: roomCode, title: questionTitle(t), body_md: questionBodyMd(t), status: 'published' }, { onConflict: 'id', ignoreDuplicates: true })
        if (qErr) throw new Error(`question insert: ${qErr.message}`)
        const { error: aErr } = await admin.from('community_answers').upsert({ id: aId, question_id: qId, author_id: BOT.id, body_md: answerBodyMd(t, parsed), status: 'published', is_accepted: true }, { onConflict: 'id', ignoreDuplicates: true })
        if (aErr) throw new Error(`answer insert: ${aErr.message}`)
        const { error: uErr } = await admin.from('community_questions').update({ accepted_answer_id: aId }).eq('id', qId)
        if (uErr) throw new Error(`link accepted answer: ${uErr.message}`)
        console.log(`  ✓ ${lbl} → /community/questions/${qId} (room ${roomCode})`)
      }
      ok++
    } catch (e) {
      fail++
      console.log(`  ✗ ${lbl} — ${e.message}`)
    }
  }
  console.log(`\nDone. ${ok} ok, ${fail} failed.${DRY ? ` Samples in ${OUT_DIR}` : ' Inserted as IB community_questions (board=ib).'}\n`)
}

main().catch((e) => { console.error(e); process.exit(1) })
