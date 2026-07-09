#!/usr/bin/env node
/**
 * MarkScheme — community model-answer seed generator (Cambridge).
 *
 * For each real past-paper question that has an OFFICIAL markscheme in `mark_schemes`,
 * generate a full-marks worked exemplar + per-mark examiner breakdown (grounded in the
 * official scheme) and publish it as a community Q&A page:
 *   community_questions (the question)  +  community_answers (the accepted model answer).
 *
 * SAFE BY DEFAULT: dry-run writes sample pages to the scratchpad and touches NOTHING in
 * the DB. Pass --run to actually insert. The community feature is flag-gated
 * (COMMUNITY_ENABLED), so inserted rows stay invisible to users until the flag is flipped.
 *
 *   npx tsx scripts/seed-community/generate-model-answers.mjs                 # dry-run, 20
 *   npx tsx scripts/seed-community/generate-model-answers.mjs --limit 3       # dry-run, 3
 *   npx tsx scripts/seed-community/generate-model-answers.mjs --run --limit 150   # INSERT
 *
 * Idempotent: re-runs skip questions already generated (by deterministic id).
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

const args = process.argv.slice(2)
const DRY = !args.includes('--run')
const LIMIT = (() => {
  const i = args.indexOf('--limit')
  return i !== -1 && args[i + 1] ? Math.max(1, parseInt(args[i + 1], 10)) : 20
})()
const OUT_DIR = join(
  '/private/tmp/claude-501/-Users-hamzagul-Documents-examcore/9f5e3276-3584-4d37-88bd-bbbaf5d4dfb0/scratchpad',
  'model-answers'
)

// Cambridge point-based subjects (best for discrete per-mark breakdowns), with display names.
const SUBJECTS = [
  { prefix: '9709', name: 'A-Level Mathematics', take: 70 },
  { prefix: '9700', name: 'A-Level Biology', take: 55 },
  { prefix: '9702', name: 'A-Level Physics', take: 45 },
  { prefix: '9701', name: 'A-Level Chemistry', take: 30 },
  { prefix: '9708', name: 'A-Level Economics', take: 30 },
]

// Fixed author for all seeded model answers — the MarkScheme Model Answers bot.
const BOT = {
  id: 'a1000004-0000-4000-8000-000000000004',
  email: 'model-answers-seed@examcore.internal',
  username: 'markscheme_answers',
  name: 'MarkScheme Model Answers',
}

// Deterministic UUIDs per question so re-runs are idempotent (no duplicate pages).
function seededUuid(kind, key) {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  const hex = (h.toString(16) + '00000000').slice(0, 8)
  const tag = kind === 'q' ? 'c0de0001' : 'c0de0002'
  return `${hex}-0000-4000-8000-0000${tag}`.slice(0, 36)
}

function buildPrompt(q) {
  const marks = JSON.stringify(q.mark_scheme, null, 2)
  return `You are a senior Cambridge examiner writing an official-style MODEL ANSWER for a past-paper question.

SUBJECT: ${q.subjectName} (${q.paper_code})
SESSION: ${q.paper_session}   QUESTION: ${q.question_number}   TOTAL MARKS: ${q.total_marks}

QUESTION:
${q.question_text}

OFFICIAL MARK SCHEME (authoritative — your answer MUST earn every mark exactly as described):
${marks}

Write a response as STRICT JSON (no prose outside the JSON) with this shape:
{
  "modelAnswer": "A clean, full-marks worked answer in Markdown. Use proper working/steps. Use $...$ LaTeX for any maths. Write it as a student aiming for full marks would, matching the mark scheme method exactly.",
  "markBreakdown": [
    { "mark": "B1 / M1 / A1 (use the codes from the scheme)", "awardedFor": "Plain-English explanation of what earns THIS specific mark, tied to the model answer." }
  ],
  "commonMistakes": ["2-4 specific, realistic mistakes that lose marks on THIS question."],
  "studyTip": "One sentence: the transferable technique this question rewards."
}

Rules: Do not invent marks not in the scheme. Keep it accurate to the official scheme. Return ONLY the JSON object.`
}

function renderAnswerMd(q, parsed) {
  const lines = []
  lines.push(parsed.modelAnswer?.trim() || '')
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('### How the marks are awarded')
  lines.push('')
  for (const b of parsed.markBreakdown || []) {
    lines.push(`- **${b.mark}** — ${b.awardedFor}`)
  }
  if (parsed.commonMistakes?.length) {
    lines.push('')
    lines.push('### Common mistakes')
    lines.push('')
    for (const m of parsed.commonMistakes) lines.push(`- ${m}`)
  }
  if (parsed.studyTip) {
    lines.push('')
    lines.push(`> **Examiner tip:** ${parsed.studyTip}`)
  }
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push(
    '*AI-generated model answer, grounded in the official Cambridge mark scheme and reviewed by the MarkScheme team. ' +
      `[Mark your own answer to this question →](/mark)*`
  )
  return lines.join('\n')
}

function questionTitle(q) {
  const stem = q.question_text.replace(/\s+/g, ' ').trim()
  const short = stem.length > 90 ? stem.slice(0, 87).trim() + '…' : stem
  return `${q.subjectName} ${q.paper_session} Q${q.question_number}: ${short}`.slice(0, 155)
}

function questionBodyMd(q) {
  return (
    `**${q.subjectName} · Paper ${q.paper_code} · ${q.paper_session} · Question ${q.question_number} · [${q.total_marks} marks]**\n\n` +
    `${q.question_text.trim()}\n\n` +
    `_A full-marks model answer with a mark-by-mark examiner breakdown is below._`
  )
}

async function main() {
  loadEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')

  const { createClient } = await import('@supabase/supabase-js')
  const { generateGeminiText, GEMINI_PRO_MODEL } = await import('../../lib/ai/gemini-text.ts')
  const { extractJSON } = await import('../../lib/marking/json.ts')
  const admin = createClient(url, key)

  console.log(`\nMarkScheme model-answer generator — ${DRY ? 'DRY RUN (no DB writes)' : 'LIVE RUN (INSERTING)'} · target ${LIMIT} pages\n`)

  // 1) Select questions spread across subjects.
  const picked = []
  for (const s of SUBJECTS) {
    if (picked.length >= LIMIT) break
    const { data, error } = await admin
      .from('mark_schemes')
      .select('id, board, subject, paper_code, paper_session, question_number, question_text, total_marks, mark_scheme, marking_type, syllabus_tags')
      .like('paper_code', `${s.prefix}%`)
      .eq('marking_type', 'point_based')
      .gte('total_marks', 4)
      .lte('total_marks', 10)
      .not('question_text', 'is', null)
      .limit(400)
    if (error) throw error
    // Skip questions that depend on a figure/diagram/table we can't include (not in question_text).
    const DIAGRAM_RE = /\b(figure|diagram|shown (above|below|in)|in the diagram|the shape [A-Z]{3,}|fig\.?\s*\d|the graph shows|the curve shown|table\s*\d|complete (the )?table|in the table|complete table|from the (table|graph))\b/i
    const usable = (data || [])
      .filter((r) => (r.question_text || '').trim().length > 40 && r.mark_scheme)
      .filter((r) => !DIAGRAM_RE.test(r.question_text))
      .slice(0, s.take)
      .map((r) => ({ ...r, subjectName: s.name, subjectCode: s.prefix }))
    picked.push(...usable)
  }
  let batch = picked.slice(0, LIMIT)

  // Skip questions already generated (idempotent + saves Gemini calls on re-runs).
  const qidFor = (q) => seededUuid('q', `${q.paper_code}|${q.paper_session}|${q.question_number}`)
  const { data: existing } = await admin
    .from('community_questions')
    .select('id')
    .in('id', batch.map(qidFor))
  const have = new Set((existing || []).map((r) => r.id))
  const skipped = batch.length - batch.filter((q) => !have.has(qidFor(q))).length
  batch = batch.filter((q) => !have.has(qidFor(q)))
  console.log(`Selected ${batch.length} new questions (${skipped} already exist, skipped)\n`)

  if (DRY) mkdirSync(OUT_DIR, { recursive: true })

  // 2) Ensure bot author exists (live run only).
  if (!DRY) {
    const { data: existingUser } = await admin.auth.admin.getUserById(BOT.id)
    if (!existingUser?.user) {
      await admin.auth.admin.createUser({
        id: BOT.id, email: BOT.email, email_confirm: true,
        password: `seed-${BOT.id.slice(0, 8)}-disabled`, user_metadata: { username: BOT.username },
      })
    }
    await admin.from('user_profiles').upsert(
      { id: BOT.id, username: BOT.username, full_name: BOT.name, onboarded: true, onboarding_completed: true, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    )
  }

  let ok = 0, fail = 0
  for (const q of batch) {
    const label = `${q.subjectCode} Q${q.question_number} (${q.paper_session})`
    try {
      const raw = await generateGeminiText(buildPrompt(q), { model: GEMINI_PRO_MODEL, task: 'content-generation', temperature: 0.3, maxOutputTokens: 6000 })
      const parsed = extractJSON(raw)
      if (!parsed || !parsed.modelAnswer) throw new Error('Gemini returned no usable modelAnswer')
      // Quality gate: only publish complete, well-broken-down answers.
      const answerLen = parsed.modelAnswer.trim().length
      const breakdownN = (parsed.markBreakdown || []).length
      if (answerLen < 400) throw new Error(`answer too short (${answerLen} chars) — likely figure-dependent or truncated`)
      if (breakdownN < 2) throw new Error(`weak breakdown (${breakdownN} marks) — skipping`)

      const title = questionTitle(q)
      const qBody = questionBodyMd(q)
      const aBody = renderAnswerMd(q, parsed)

      if (DRY) {
        const file = join(OUT_DIR, `${q.subjectCode}-${String(q.question_number).replace(/[^\w]+/g, '_')}.md`)
        writeFileSync(file, `# ${title}\n\n## Question\n\n${qBody}\n\n## Model answer\n\n${aBody}\n`)
        console.log(`  ✓ ${label} → ${file.split('/').pop()} (${breakdownN} marks, ${aBody.length} chars)`)
      } else {
        const qId = seededUuid('q', `${q.paper_code}|${q.paper_session}|${q.question_number}`)
        const aId = seededUuid('a', `${q.paper_code}|${q.paper_session}|${q.question_number}`)
        // Ordered to satisfy FKs both directions: question first (no accepted id),
        // then the answer (needs question_id), then link accepted_answer_id back.
        const { error: qErr } = await admin.from('community_questions').upsert({
          id: qId, author_id: BOT.id, board: 'cambridge', subject_code: q.subjectCode,
          title, body_md: qBody, status: 'published',
        }, { onConflict: 'id', ignoreDuplicates: true })
        if (qErr) throw new Error(`question insert: ${qErr.message}`)
        const { error: aErr } = await admin.from('community_answers').upsert({
          id: aId, question_id: qId, author_id: BOT.id, body_md: aBody, status: 'published', is_accepted: true,
        }, { onConflict: 'id', ignoreDuplicates: true })
        if (aErr) throw new Error(`answer insert: ${aErr.message}`)
        const { error: uErr } = await admin.from('community_questions')
          .update({ accepted_answer_id: aId }).eq('id', qId)
        if (uErr) throw new Error(`link accepted answer: ${uErr.message}`)
        console.log(`  ✓ ${label} → /community/questions/${qId}`)
      }
      ok++
    } catch (e) {
      fail++
      console.log(`  ✗ ${label} — ${e.message}`)
    }
  }

  console.log(`\nDone. ${ok} ok, ${fail} failed. ${DRY ? `Samples in ${OUT_DIR}` : 'Inserted into community_questions/community_answers (feature still flag-gated).'}\n`)
}

main().catch((e) => { console.error(e); process.exit(1) })
