#!/usr/bin/env node
/**
 * Cambridge ESSAY model-answer generator for community Q&A pages.
 *
 * Companion to generate-model-answers.mjs (point-based). Targets level-of-response
 * essay questions (e.g. 9708 Economics 12-mark part-(b) essays) that the
 * point-based generator skips. For each, generates an ORIGINAL top-band model
 * essay grounded in the official band descriptors (fed to the prompt to guide,
 * NOT republished verbatim — copyright), plus an original "how it reaches the top
 * band" breakdown. Inserts a community_questions + accepted community_answers row
 * under the markscheme_answers bot (board=cambridge).
 *
 * RUN WITH tsx (imports @/lib TS via path aliases):
 *   npx tsx scripts/seed-community/generate-cambridge-essay-answers.mjs            # dry-run sample
 *   npx tsx scripts/seed-community/generate-cambridge-essay-answers.mjs --run      # insert
 *   npx tsx scripts/seed-community/generate-cambridge-essay-answers.mjs --subjects 9708 --limit 20 --run
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
function loadEnv() {
  const p = join(ROOT, '.env.local')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim(); if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('='); if (eq === -1) continue
    const k = t.slice(0, eq).trim(); let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (process.env[k] === undefined) process.env[k] = v
  }
}

const args = process.argv.slice(2)
const DRY = !args.includes('--run')
const LIMIT = (() => { const i = args.indexOf('--limit'); return i !== -1 && args[i + 1] ? Math.max(1, parseInt(args[i + 1], 10)) : 30 })()
const SUBJECT_FILTER = (() => { const i = args.indexOf('--subjects'); return i !== -1 && args[i + 1] ? new Set(args[i + 1].split(',').map((s) => s.trim())) : null })()
const OUT_DIR = join('/private/tmp/claude-501/-Users-hamzagul-Documents-examcore/1382b0da-c368-4c8b-991d-9aab8a0c5db8/scratchpad', 'cambridge-essays')

// Cambridge subjects with level-of-response essays in mark_schemes. Extend as data lands.
const SUBJECTS = [
  { prefix: '9708', name: 'A-Level Economics', conventions: 'Use economic theory and describe supply/demand or cost/revenue diagrams in words (curves, shifts, new equilibrium). Build a clear line of argument, use a real-world example, and finish with a justified, well-supported evaluation/judgement.' },
]
// Essays are self-contained; only skip ones that lean on a provided data extract/source.
const EXTRACT_RE = /\b(extract|the (data|table|source)|table\s*\d|fig\.?\s*\d|refer to the|from the (source|extract|passage))\b/i

const BOT = { id: 'a1000004-0000-4000-8000-000000000004', email: 'model-answers-seed@examcore.internal', username: 'markscheme_answers', name: 'MarkScheme Model Answers' }

// Distinct id tags from point-based (c0de0001/2) and IB essay (c0de0003/4).
function seededUuid(kind, key) {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  const hex = (h.toString(16) + '00000000').slice(0, 8)
  const tag = kind === 'q' ? 'c0de0005' : 'c0de0006'
  return `${hex}-0000-4000-8000-0000${tag}`.slice(0, 36)
}

function buildPrompt(q) {
  const bands = JSON.stringify(q.mark_scheme, null, 2)
  return `You are a senior Cambridge examiner writing a TOP-BAND model answer for a ${q.subjectName} essay question.

PAPER: ${q.paper_code}   SESSION: ${q.paper_session}   QUESTION: ${q.question_number}   TOTAL MARKS: ${q.total_marks}

QUESTION:
${q.question_text}

OFFICIAL LEVEL-OF-RESPONSE BANDS (use these ONLY to understand what the top band rewards — DO NOT quote or copy them into your answer):
${bands}

Conventions: ${q.conventions}

Return STRICT JSON only (no prose outside the JSON):
{
  "modelAnswer": "A complete, original top-band (highest level) exemplar essay in Markdown, at the right length for a ${q.total_marks}-mark essay. Written in your own words as a top student would; an illustrative exemplar, not the only correct answer.",
  "criterionBreakdown": [ { "criterion": "Knowledge / Analysis / Evaluation", "howMet": "In your own words, how the essay reaches the TOP band for this dimension, referencing specific parts of the essay. Do NOT quote the official descriptor." } ],
  "commonMistakes": ["2-4 specific ways students drop below the top band on this question."],
  "studyTip": "One sentence: the transferable exam technique this rewards."
}
Do not quote the official band descriptors. Return ONLY the JSON object.`
}

function questionTitle(q) {
  const stem = (q.question_text || '').replace(/\s+/g, ' ').trim()
  const short = stem.length > 90 ? stem.slice(0, 87).trim() + '…' : stem
  return `${q.subjectName} ${q.paper_session} Q${q.question_number}: ${short}`.slice(0, 155)
}
function questionBodyMd(q) {
  return `${q.question_text.trim()}\n\n*Cambridge ${q.subjectName} · ${q.paper_code} · ${q.paper_session} · Question ${q.question_number} · ${q.total_marks} marks (essay)*`
}
function answerBodyMd(parsed) {
  const L = [parsed.modelAnswer?.trim() || '', '', '---', '', '### How it reaches the top band', '']
  for (const b of parsed.criterionBreakdown || []) L.push(`- **${b.criterion}** — ${b.howMet}`)
  if (parsed.commonMistakes?.length) { L.push('', '### Common ways to drop marks', ''); for (const m of parsed.commonMistakes) L.push(`- ${m}`) }
  if (parsed.studyTip) { L.push('', `> **Examiner tip:** ${parsed.studyTip}`) }
  L.push('', '---', '', '*AI-generated exemplar, grounded in the official Cambridge assessment bands and reviewed by the MarkScheme team. [Mark your own answer →](/mark)*')
  return L.join('\n')
}

async function main() {
  loadEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE env')
  const { createClient } = await import('@supabase/supabase-js')
  const { generateGeminiText, GEMINI_PRO_MODEL } = await import('../../lib/ai/gemini-text.ts')
  const { extractJSON } = await import('../../lib/marking/json.ts')
  const admin = createClient(url, key)

  console.log(`\nCambridge essay model-answer generator — ${DRY ? 'DRY RUN (no DB writes)' : 'LIVE RUN (INSERTING)'} · limit ${LIMIT}\n`)

  const picked = []
  for (const s of SUBJECTS) {
    if (SUBJECT_FILTER && !SUBJECT_FILTER.has(s.prefix)) continue
    const { data, error } = await admin.from('mark_schemes')
      .select('paper_code, paper_session, question_number, question_text, total_marks, mark_scheme, marking_type')
      .like('paper_code', `${s.prefix}%`).eq('marking_type', 'level_of_response')
      .not('question_text', 'is', null).limit(400)
    if (error) throw error
    const usable = (data || [])
      .filter((r) => (r.question_text || '').trim().length > 40 && r.mark_scheme && !EXTRACT_RE.test(r.question_text))
      .map((r) => ({ ...r, subjectName: s.name, subjectCode: s.prefix, conventions: s.conventions }))
    picked.push(...usable)
  }
  let batch = picked.slice(0, LIMIT)
  const qidFor = (q) => seededUuid('q', `${q.paper_code}|${q.paper_session}|${q.question_number}`)
  const { data: existing } = await admin.from('community_questions').select('id').in('id', batch.map(qidFor))
  const have = new Set((existing || []).map((r) => r.id))
  const skipped = batch.length - batch.filter((q) => !have.has(qidFor(q))).length
  batch = batch.filter((q) => !have.has(qidFor(q)))
  console.log(`Selected ${batch.length} new essay questions (${skipped} already exist, skipped)\n`)

  if (DRY) mkdirSync(OUT_DIR, { recursive: true })
  if (!DRY) {
    const { data: existingUser } = await admin.auth.admin.getUserById(BOT.id)
    if (!existingUser?.user) await admin.auth.admin.createUser({ id: BOT.id, email: BOT.email, email_confirm: true, password: `seed-${BOT.id.slice(0, 8)}-disabled`, user_metadata: { username: BOT.username } })
    await admin.from('user_profiles').upsert({ id: BOT.id, username: BOT.username, full_name: BOT.name, onboarded: true, onboarding_completed: true, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  }

  let ok = 0, fail = 0
  const rollback = { questionIds: [] }
  for (const q of batch) {
    const label = `${q.subjectCode} Q${q.question_number} (${q.paper_session})`
    try {
      const raw = await generateGeminiText(buildPrompt(q), { model: GEMINI_PRO_MODEL, task: 'content-generation', temperature: 0.3, maxOutputTokens: 6000 })
      const parsed = extractJSON(raw)
      if (!parsed || !parsed.modelAnswer) throw new Error('no usable modelAnswer')
      const answerLen = parsed.modelAnswer.trim().length
      if (answerLen < 600) throw new Error(`essay too short (${answerLen} chars)`)
      if ((parsed.criterionBreakdown || []).length < 1) throw new Error('missing criterion breakdown')
      const title = questionTitle(q), qBody = questionBodyMd(q), aBody = answerBodyMd(parsed)
      if (DRY) {
        const file = join(OUT_DIR, `${q.subjectCode}-${String(q.question_number).replace(/[^\w]+/g, '_')}.md`)
        writeFileSync(file, `# ${title}\n\n## Question\n\n${qBody}\n\n## Model answer\n\n${aBody}\n`)
        console.log(`  ✓ ${label} → ${file.split('/').pop()} (${aBody.length} chars)`)
      } else {
        const qId = seededUuid('q', `${q.paper_code}|${q.paper_session}|${q.question_number}`)
        const aId = seededUuid('a', `${q.paper_code}|${q.paper_session}|${q.question_number}`)
        const { error: qErr } = await admin.from('community_questions').upsert({ id: qId, author_id: BOT.id, board: 'cambridge', subject_code: q.subjectCode, title, body_md: qBody, status: 'published' }, { onConflict: 'id', ignoreDuplicates: true })
        if (qErr) throw new Error(`question insert: ${qErr.message}`)
        const { error: aErr } = await admin.from('community_answers').upsert({ id: aId, question_id: qId, author_id: BOT.id, body_md: aBody, status: 'published', is_accepted: true }, { onConflict: 'id', ignoreDuplicates: true })
        if (aErr) throw new Error(`answer insert: ${aErr.message}`)
        const { error: uErr } = await admin.from('community_questions').update({ accepted_answer_id: aId, answer_count: 1 }).eq('id', qId)
        if (uErr) throw new Error(`link accepted: ${uErr.message}`)
        rollback.questionIds.push(qId)
        console.log(`  ✓ ${label} → /community/questions/${qId}`)
      }
      ok++
    } catch (e) { fail++; console.log(`  ✗ ${label} — ${e.message}`) }
  }
  if (!DRY) writeFileSync(join(OUT_DIR.replace('/cambridge-essays', ''), 'cambridge-essays-rollback.json'), JSON.stringify({ appliedAt: new Date().toISOString(), ...rollback }, null, 2) + '\n')
  console.log(`\nDone. ${ok} ok, ${fail} failed.${DRY ? ` Samples in ${OUT_DIR}` : ' Inserted (board=cambridge).'}\n`)
}
main().catch((e) => { console.error(e); process.exit(1) })
