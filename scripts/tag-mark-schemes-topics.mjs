#!/usr/bin/env node
/**
 * DRY-RUN topic tagger for /past-papers/[code]/[topic] growth.
 *
 * Classifies UNTAGGED, usable mark_schemes questions into a subject's course
 * lesson topic codes using Gemini Flash, then reports how many NEW topic pages
 * the tags would unlock (topics reaching >= MIN_QUESTIONS). Writes a review file
 * to the scratchpad. DOES NOT WRITE TO mark_schemes — apply is a separate step
 * gated on human review.
 *
 * Usage: node scripts/tag-mark-schemes-topics.mjs [--subject=9709] [--limit=N]
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs'
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

const MIN_QUESTIONS = 3          // matches generate-topic-questions-cache.mjs (page threshold)
const MARKS_MIN = 2, MARKS_MAX = 12
const BATCH = 15                 // questions per Gemini call
const CONCURRENCY = 2             // Vertex per-minute quota is tight; keep low
const MAX_RETRIES = 6            // exponential backoff on 429/5xx
const MODEL = 'gemini-2.5-flash'
const STEM_MAX = 320

const args = process.argv.slice(2)
const ONLY = (args.find((a) => a.startsWith('--subject=')) || '').split('=')[1] || null
const LIMIT = parseInt((args.find((a) => a.startsWith('--limit=')) || '').split('=')[1] || '0', 10) || 0
const SUBJECTS = ONLY ? [ONLY] : ['9709', '9701', '9702', '9700', '9708']

const OUT_DIR = process.env.SCRATCHPAD_DIR ||
  '/private/tmp/claude-501/-Users-hamzagul-Documents-examcore/1382b0da-c368-4c8b-991d-9aab8a0c5db8/scratchpad'
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
// Match the app: prefer Vertex (separate billing) when USE_VERTEX_AI=true, else
// fall back to the AI Studio API key. ADC comes from GOOGLE_APPLICATION_CREDENTIALS.
const ai = process.env.USE_VERTEX_AI === 'true'
  ? new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    })
  : new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

function topicsForSubject(code) {
  const dir = join(ROOT, 'content', 'courses', code)
  if (!existsSync(dir)) return []
  const out = []
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    try {
      const j = JSON.parse(readFileSync(join(dir, f), 'utf8'))
      if (j.topicCode && j.title) out.push({ topicCode: String(j.topicCode), title: j.title })
    } catch {}
  }
  // de-dup by topicCode, keep first title
  const seen = new Map()
  for (const t of out) if (!seen.has(t.topicCode)) seen.set(t.topicCode, t.title)
  return [...seen.entries()].map(([topicCode, title]) => ({ topicCode, title }))
}

function excerpt(text) {
  const t = (text || '').replace(/\s+/g, ' ').trim()
  return t.length > STEM_MAX ? t.slice(0, STEM_MAX) + '…' : t
}
function isTagged(tags) { return Array.isArray(tags) && tags.length > 0 }

function parseJson(txt) {
  const s = (txt || '').replace(/```json/gi, '').replace(/```/g, '').trim()
  const a = s.indexOf('{'); const b = s.lastIndexOf('}')
  if (a < 0 || b < 0) return null
  try { return JSON.parse(s.slice(a, b + 1)) } catch { return null }
}

async function classifyBatch(code, topics, batch) {
  const topicList = topics.map((t) => `${t.topicCode}: ${t.title}`).join('\n')
  const qList = batch.map((q, i) => `[${i}] (${q.total_marks} marks) ${excerpt(q.question_text)}`).join('\n')
  const prompt = `You are tagging Cambridge ${code} past-paper questions to syllabus topics.
Here are the valid topic codes for this subject:
${topicList}

For each question below, choose the SINGLE best-fitting topic code from the list above.
If a question does not clearly belong to exactly one listed topic, return null for it.
Return ONLY a JSON object mapping the question index (as a string) to a topic code or null, e.g. {"0":"1.2","1":null}.

Questions:
${qList}`
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0 },
      })
      const map = parseJson(res.text) || {}
      const valid = new Set(topics.map((t) => t.topicCode))
      return batch.map((q, i) => {
        const picked = map[String(i)]
        return { id: q.id, topicCode: valid.has(picked) ? picked : null }
      })
    } catch (err) {
      const msg = String(err?.message || err)
      const retryable = /429|RESOURCE_EXHAUSTED|50\d|deadline|UNAVAILABLE/i.test(msg)
      if (!retryable || attempt === MAX_RETRIES) {
        console.warn(`  batch failed (${batch.length} q) after ${attempt} retries: ${msg.slice(0, 80)}`)
        return batch.map((q) => ({ id: q.id, topicCode: null }))
      }
      const waitMs = Math.min(30000, 2000 * 2 ** attempt) + Math.floor(Math.random() * 1000)
      await new Promise((r) => setTimeout(r, waitMs))
    }
  }
}

async function mapConcurrent(items, limit, fn) {
  const out = new Array(items.length); let next = 0
  const worker = async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i], i) } }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

const report = { generatedAt: new Date().toISOString(), model: MODEL, subjects: {} }
const allProposals = []

for (const code of SUBJECTS) {
  const topics = topicsForSubject(code)
  if (!topics.length) { console.log(`${code}: no course topics, skipping`); continue }
  const topicTitle = new Map(topics.map((t) => [t.topicCode, t.title]))

  // Pull all usable rows (tagged + untagged) so we can compute projected pages.
  const { data, error } = await sb
    .from('mark_schemes')
    .select('id,paper_code,question_number,question_text,total_marks,syllabus_tags')
    .like('paper_code', `${code}%`)
    .not('question_text', 'is', null)
    .gte('total_marks', MARKS_MIN)
    .lte('total_marks', MARKS_MAX)
  if (error) { console.log(`${code}: query error ${error.message}`); continue }

  const rows = data || []
  const untagged = rows.filter((r) => !isTagged(r.syllabus_tags))
  const toClassify = LIMIT ? untagged.slice(0, LIMIT) : untagged
  console.log(`${code}: ${rows.length} usable rows, ${untagged.length} untagged → classifying ${toClassify.length}`)

  const batches = []
  for (let i = 0; i < toClassify.length; i += BATCH) batches.push(toClassify.slice(i, i + BATCH))
  const results = (await mapConcurrent(batches, CONCURRENCY, (b) => classifyBatch(code, topics, b))).flat()

  const proposedByTopic = new Map()   // topicCode -> count of newly proposed
  let assigned = 0
  const byId = new Map(toClassify.map((r) => [r.id, r]))
  for (const r of results) {
    if (!r.topicCode) continue
    assigned++
    proposedByTopic.set(r.topicCode, (proposedByTopic.get(r.topicCode) || 0) + 1)
    const src = byId.get(r.id)
    allProposals.push({
      subject: code, id: r.id, paper_code: src.paper_code, question_number: src.question_number,
      total_marks: src.total_marks, topicCode: r.topicCode, topicTitle: topicTitle.get(r.topicCode),
      stem: excerpt(src.question_text),
    })
  }

  // Existing eligible counts per topic (already-tagged usable rows).
  const existingByTopic = new Map()
  for (const r of rows) {
    if (!isTagged(r.syllabus_tags)) continue
    for (const t of r.syllabus_tags) if (topicTitle.has(t)) existingByTopic.set(t, (existingByTopic.get(t) || 0) + 1)
  }
  // Projected pages = topics reaching MIN_QUESTIONS with existing+proposed.
  const allTopicCodes = new Set([...existingByTopic.keys(), ...proposedByTopic.keys()])
  let pagesNow = 0, pagesAfter = 0
  for (const tc of allTopicCodes) {
    const before = existingByTopic.get(tc) || 0
    const after = before + (proposedByTopic.get(tc) || 0)
    if (before >= MIN_QUESTIONS) pagesNow++
    if (after >= MIN_QUESTIONS) pagesAfter++
  }

  report.subjects[code] = {
    usableRows: rows.length, untagged: untagged.length, classified: toClassify.length,
    newlyAssigned: assigned, topicsTouched: proposedByTopic.size,
    projectedPages: { now: pagesNow, after: pagesAfter, gain: pagesAfter - pagesNow },
  }
  console.log(`  → assigned ${assigned}/${toClassify.length}; topic pages ${pagesNow} → ${pagesAfter} (+${pagesAfter - pagesNow})`)
}

const jsonPath = join(OUT_DIR, 'topic-tag-proposals.json')
writeFileSync(jsonPath, JSON.stringify({ report, proposals: allProposals }, null, 2) + '\n')

// Human-readable review sample (first 8 proposals per subject).
let md = `# Topic-tag dry-run — ${report.generatedAt}\n\nModel: ${report.model}. NO prod writes. Review before applying.\n\n`
for (const [code, s] of Object.entries(report.subjects)) {
  md += `## ${code}\n\n- untagged usable: ${s.untagged}, classified: ${s.classified}, newly assigned: ${s.newlyAssigned}\n`
  md += `- **projected topic pages: ${s.projectedPages.now} → ${s.projectedPages.after} (+${s.projectedPages.gain})**\n\n`
  const sample = allProposals.filter((p) => p.subject === code).slice(0, 8)
  for (const p of sample) md += `  - \`${p.topicCode}\` ${p.topicTitle} ← [${p.paper_code} ${p.question_number}, ${p.total_marks}m] ${p.stem.slice(0, 110)}\n`
  md += `\n`
}
const mdPath = join(OUT_DIR, 'topic-tag-proposals.md')
writeFileSync(mdPath, md)

const totalGain = Object.values(report.subjects).reduce((a, s) => a + s.projectedPages.gain, 0)
console.log(`\nTOTAL projected new topic pages: +${totalGain}`)
console.log(`Wrote ${jsonPath}`)
console.log(`Wrote ${mdPath}`)
