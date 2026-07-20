#!/usr/bin/env node
/**
 * Seed community Q&A "model answer" pages from tagged mark_schemes questions.
 *
 * For each self-contained past-paper question (topic-tagged, no missing figure),
 * generates an ORIGINAL worked model answer + a natural student-phrased title via
 * Gemini (Vertex), and builds a community_questions row + an accepted
 * community_answers row. These render at /community/questions/[id] and enter the
 * sitemap once COMMUNITY_ENABLED=true.
 *
 * IMPORTANT: model answers are original explanations — the prompt forbids copying
 * any official Cambridge mark scheme (copyright). Figure-dependent questions are
 * skipped (model returns SKIP).
 *
 * Dry-run by default: writes a review sample to the scratchpad, NO prod writes.
 * Usage: node scripts/seed-community-qa.mjs [--limit=N] [--per-subject=N] [--apply]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const t = line.trim(); if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('='); if (eq < 0) continue
  const k = t.slice(0, eq).trim(); let v = t.slice(eq + 1).trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  if (process.env[k] === undefined) process.env[k] = v
}

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const PER_SUBJECT = parseInt((args.find((a) => a.startsWith('--per-subject=')) || '').split('=')[1] || '2', 10)
const LIMIT = parseInt((args.find((a) => a.startsWith('--limit=')) || '').split('=')[1] || '0', 10) || 0
const MODEL = 'gemini-2.5-flash'
const CONCURRENCY = 2
const MAX_RETRIES = 6
const SCRATCH = '/private/tmp/claude-501/-Users-hamzagul-Documents-examcore/1382b0da-c368-4c8b-991d-9aab8a0c5db8/scratchpad'
if (!existsSync(SCRATCH)) mkdirSync(SCRATCH, { recursive: true })

// Deterministic seed author for model-answer content.
const SEED_AUTHOR = { id: 'a1000004-0000-4000-8000-000000000004', email: 'modelanswers-seed@examcore.internal', username: 'model_answers', name: 'Model Answers' }
const SUBJECTS = [
  { code: '9700', name: 'Biology', board: 'cambridge' },
  { code: '9701', name: 'Chemistry', board: 'cambridge' },
  { code: '9702', name: 'Physics', board: 'cambridge' },
  { code: '9708', name: 'Economics', board: 'cambridge' },
  { code: '9709', name: 'Mathematics', board: 'cambridge' },
]
// Skip questions that lean on a figure/table we don't have.
const FIGURE_RE = /\b(diagram|fig\.?|figure|table|graph|shown in|photograph|complete the|refer to|the image|as shown|below shows|above shows)\b/i

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const ai = process.env.USE_VERTEX_AI === 'true'
  ? new GoogleGenAI({ vertexai: true, project: process.env.GOOGLE_CLOUD_PROJECT, location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1' })
  : new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

function parseJson(txt) {
  const s = (txt || '').replace(/```json/gi, '').replace(/```/g, '').trim()
  const a = s.indexOf('{'); const b = s.lastIndexOf('}')
  if (a < 0 || b < 0) return null
  try { return JSON.parse(s.slice(a, b + 1)) } catch { return null }
}

async function generate(subject, row) {
  const prompt = `You are an experienced Cambridge ${subject.name} (${subject.code}) examiner writing a model answer for a student revision community.

Question (worth ${row.total_marks} marks):
"""${row.question_text}"""

Write an ORIGINAL, concise worked model answer that would earn full marks. Show the method and reasoning a student should write. Do NOT copy or quote any official mark scheme — write your own explanation in your own words. Use plain markdown (no headings).

Also write a short, natural question title as a student would search it (max 110 chars, no quotes).

If the question cannot be answered without a figure, diagram, table or data that is not included above, respond with {"skip": true} only.

Return ONLY JSON: {"skip": false, "title": "...", "answer_md": "..."}`
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: MODEL, contents: [{ role: 'user', parts: [{ text: prompt }] }], config: { temperature: 0.2 },
      })
      const j = parseJson(res.text)
      if (!j || j.skip || !j.answer_md || !j.title) return null
      return { title: String(j.title).slice(0, 155), answer_md: String(j.answer_md).slice(0, 8000) }
    } catch (err) {
      const msg = String(err?.message || err)
      if (!/429|RESOURCE_EXHAUSTED|50\d|deadline|UNAVAILABLE/i.test(msg) || attempt === MAX_RETRIES) {
        console.warn(`  gen failed: ${msg.slice(0, 80)}`); return null
      }
      await new Promise((r) => setTimeout(r, Math.min(30000, 2000 * 2 ** attempt) + Math.floor(Math.random() * 1000)))
    }
  }
  return null
}

async function mapConcurrent(list, limit, fn) {
  const out = new Array(list.length); let next = 0
  const worker = async () => { while (next < list.length) { const i = next++; out[i] = await fn(list[i], i) } }
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, worker))
  return out
}

// 1) Collect candidate questions: tagged, usable, self-contained.
const candidates = []
for (const s of SUBJECTS) {
  const { data } = await sb.from('mark_schemes')
    .select('id,paper_code,paper_session,question_number,question_text,total_marks,syllabus_tags')
    .like('paper_code', `${s.code}%`)
    .not('question_text', 'is', null)
    .gte('total_marks', 2).lte('total_marks', 12)
    .not('syllabus_tags', 'is', null)
  const eligible = (data || [])
    .filter((r) => Array.isArray(r.syllabus_tags) && r.syllabus_tags.length && r.question_text.length > 40 && !FIGURE_RE.test(r.question_text))
    .slice(0, PER_SUBJECT)
  for (const r of eligible) candidates.push({ subject: s, row: r })
}
const picked = LIMIT ? candidates.slice(0, LIMIT) : candidates
console.log(`Candidates: ${candidates.length} (self-contained, tagged) → generating ${picked.length}`)

// 2) Generate model answers.
const generated = []
await mapConcurrent(picked, CONCURRENCY, async (c) => {
  const g = await generate(c.subject, c.row)
  if (g) generated.push({ ...c, ...g })
})
console.log(`Generated ${generated.length}/${picked.length} model answers (rest skipped as figure-dependent)`)

// 3) Dry-run: write review sample. Apply: insert to prod.
if (!APPLY) {
  let md = `# Community Q&A seed — DRY RUN (${generated.length} model-answer pages)\n\nNO prod writes. Review quality before applying.\n\n`
  for (const g of generated) {
    md += `---\n\n## [${g.subject.code} ${g.subject.name}] ${g.title}\n\n`
    md += `**Topic tag:** \`${g.row.syllabus_tags[0]}\` · **${g.row.paper_code} ${g.row.paper_session} Q${g.row.question_number}** · ${g.row.total_marks} marks\n\n`
    md += `**Question:** ${g.row.question_text}\n\n**Model answer:**\n\n${g.answer_md}\n\n`
  }
  const p = join(SCRATCH, 'community-qa-sample.md')
  writeFileSync(p, md)
  writeFileSync(join(SCRATCH, 'community-qa-sample.json'), JSON.stringify(generated, null, 2) + '\n')
  console.log(`\n(plan only — pass --apply to write) Wrote ${p}`)
  process.exit(0)
}

// APPLY: ensure seed author, then insert question + accepted answer per item.
const { data: existingUser } = await sb.auth.admin.getUserById(SEED_AUTHOR.id)
if (!existingUser?.user) {
  await sb.auth.admin.createUser({ id: SEED_AUTHOR.id, email: SEED_AUTHOR.email, email_confirm: true, password: `seed-${SEED_AUTHOR.id.slice(0, 8)}-disabled`, user_metadata: { username: SEED_AUTHOR.username } })
}
await sb.from('user_profiles').upsert({ id: SEED_AUTHOR.id, username: SEED_AUTHOR.username, full_name: SEED_AUTHOR.name, onboarded: true, onboarding_completed: true, updated_at: new Date().toISOString() }, { onConflict: 'id' })

let wrote = 0, errors = 0
const rollback = { questionIds: [], answerIds: [] }
for (const g of generated) {
  const body = `${g.row.question_text}\n\n*Cambridge ${g.subject.name} (${g.subject.code}) · ${g.row.paper_code} ${g.row.paper_session} · Question ${g.row.question_number} · ${g.row.total_marks} marks*`
  const { data: q, error: qErr } = await sb.from('community_questions').insert({
    author_id: SEED_AUTHOR.id, board: g.subject.board, subject_code: g.subject.code,
    topic_code: g.row.syllabus_tags[0], title: g.title, body_md: body, status: 'published',
  }).select('id').single()
  if (qErr || !q) { errors++; continue }
  const { data: a, error: aErr } = await sb.from('community_answers').insert({
    question_id: q.id, author_id: SEED_AUTHOR.id, body_md: g.answer_md, status: 'published', is_accepted: true, vote_count: 1,
  }).select('id').single()
  if (aErr || !a) { errors++; rollback.questionIds.push(q.id); continue }
  await sb.from('community_questions').update({ accepted_answer_id: a.id, answer_count: 1, vote_count: 1 }).eq('id', q.id)
  rollback.questionIds.push(q.id); rollback.answerIds.push(a.id); wrote++
}
writeFileSync(join(SCRATCH, 'community-qa-rollback.json'), JSON.stringify({ appliedAt: new Date().toISOString(), ...rollback }, null, 2) + '\n')
console.log(`\nWrote ${wrote} Q&A pages, errors: ${errors}. Rollback saved (${rollback.questionIds.length} questions).`)
