#!/usr/bin/env node
// Adversarial review pass over generated question banks.
// For each question, a SECOND model independently re-solves it and checks the
// worked answer + mark scheme + subtopic code. Flags mismatches for human review.
// Report -> docs/course-upgrade/reference-derived/qbank-review.md (git-ignored).
// Usage: node scripts/analysis/verify-question-banks.mjs [subjectGlob]
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const ROOT = '/Users/hamzagul/Documents/examcore'
const GLOB = process.argv[2] || 'ib-maths-aa-*'
const MODEL = 'gemini-2.5-pro'
const CONCURRENCY = 5

// Subject-aware framing derived from the glob (e.g. ib-physics-hl → Physics).
const SUBJECT_NAMES = {
  'maths-aa': 'Mathematics: Analysis and Approaches', 'maths-ai': 'Mathematics: Applications and Interpretation',
  physics: 'Physics', biology: 'Biology', chemistry: 'Chemistry',
}
const subjKey = Object.keys(SUBJECT_NAMES).find((k) => GLOB.includes(k))
const SUBJECT_NAME = SUBJECT_NAMES[subjKey] || 'Diploma'
const IS_MATH = /maths/.test(subjKey || '')

// Same string-aware repair the generator uses — LLM LaTeX breaks naive JSON.parse.
function repairJson(s) {
  const valid = '"\\/bfnrtu'
  let out = '', inStr = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inStr) {
      if (c === '\\') { const n = s[i + 1] ?? ''; if (valid.includes(n)) { out += c + n; i++ } else { out += '\\\\' } ; continue }
      if (c === '"') { inStr = false; out += c; continue }
      if (c === '\n') { out += '\\n'; continue }
      if (c === '\r') { out += '\\r'; continue }
      if (c === '\t') { out += '\\t'; continue }
      out += c; continue
    }
    if (c === '"') inStr = true
    out += c
  }
  return out
}
const parseLenient = (raw) => { try { return JSON.parse(raw) } catch { return JSON.parse(repairJson(raw)) } }
const OUT = path.join(ROOT, `docs/course-upgrade/reference-derived/qbank-review-${subjKey || 'all'}.md`)

const env = (k) => (fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8')
  .match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1] ?? '').trim().replace(/^["']|["']$/g, '')
const PROJECT = env('GOOGLE_CLOUD_PROJECT') || 'quantum-pilot-475321-k7'
const LOCATION = env('GOOGLE_CLOUD_LOCATION') || 'us-central1'
const SA = JSON.parse(fs.readFileSync(env('GOOGLE_APPLICATION_CREDENTIALS'), 'utf8'))

let _tok = null, _exp = 0
async function token() {
  const now = Math.floor(Date.now() / 1000)
  if (_tok && now < _exp - 120) return _tok
  const b = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url')
  const claim = { iss: SA.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }
  const u = `${b({ alg: 'RS256', typ: 'JWT' })}.${b(claim)}`
  const s = crypto.sign('RSA-SHA256', Buffer.from(u), SA.private_key).toString('base64url')
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${u}.${s}` })
  _tok = (await r.json()).access_token; _exp = now + 3600
  return _tok
}

const SYS = `You are a meticulous, skeptical IB ${SUBJECT_NAME} examiner checking ONE draft practice question for correctness.
You are given the question prompt, its mark scheme, and its model answer.
1. Solve the question YOURSELF from scratch, carefully${IS_MATH ? '' : ', checking units, significant figures and physical/chemical/biological reasoning'}.
2. Copy the model answer's stated FINAL result verbatim into "stated_answer".
3. Put your own independently-computed result into "your_answer".
4. Decide whether they agree, and whether "syllabusRef" is a plausible IB ${SUBJECT_NAME} sub-topic code.
Return ONLY a single JSON object: {"stated_answer":"...","your_answer":"...","verdict":"ok"|"flag","severity":"low"|"high","issue":"one concise sentence or null","correct_answer":"the right final answer if the model answer is wrong, else null"}
Flag (verdict:"flag") ONLY when stated_answer and your_answer genuinely DISAGREE (severity "high"), or the syllabus code is clearly wrong (severity "low"). If they agree, verdict MUST be "ok". Do NOT flag wording or style. Judge ONLY the question given.`

// Verify ONE question per call — small, reliable, no all-or-nothing batch failures.
async function verifyQuestion(item) {
  const { q, file, topic } = item
  const payload = {
    id: q.id, syllabusRef: q.syllabusRef, marks: q.marks, prompt: q.prompt,
    markScheme: q.markScheme.map((m) => `[${m.marks}] ${m.text}`), modelAnswer: q.modelAnswer,
  }
  const user = `Topic: ${topic}. Check this single question:\n${JSON.stringify(payload, null, 1)}`
  const body = { systemInstruction: { parts: [{ text: SYS }] }, contents: [{ role: 'user', parts: [{ text: user }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 4000, responseMimeType: 'application/json' } }
  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${await token()}`, 'content-type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) {
        if (res.status === 429) { await new Promise((r) => setTimeout(r, 4000 * attempt)); continue }
        if (attempt === 4) throw new Error(`${res.status}`); continue
      }
      const txt = (await res.json()).candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? ''
      const v = parseLenient(txt.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim())
      if (!v || !v.verdict) { if (attempt < 4) continue; throw new Error('no verdict in response') }
      return { id: q.id, ...v, file: path.basename(file), topic }
    } catch (e) { if (attempt === 4) return { id: q.id, verdict: 'error', severity: 'high', issue: String(e).slice(0, 100), file: path.basename(file), topic } }
  }
  // Fallback: if the final attempt exhausted via a 429 `continue`, never drop it.
  return { id: q.id, verdict: 'error', severity: 'high', issue: 'no response after retries (rate-limited)', file: path.basename(file), topic }
}

// Flatten every question across all matched lessons into one work queue.
const items = []
for (const dir of fs.readdirSync(path.join(ROOT, 'content/courses')).filter((n) => n.match(new RegExp(GLOB.replace('*', '.*'))))) {
  const full = path.join(ROOT, 'content/courses', dir)
  if (!fs.statSync(full).isDirectory()) continue
  for (const f of fs.readdirSync(full)) {
    if (!f.endsWith('.pilot.json')) continue
    const d = JSON.parse(fs.readFileSync(path.join(full, f), 'utf8'))
    for (const q of d.questionBank ?? []) items.push({ q, file: path.join(full, f), topic: `${d.topicCode} ${d.title}` })
  }
}
console.log(`Reviewing ${items.length} questions with ${MODEL} (concurrency ${CONCURRENCY}, per-question)…\n`)

const all = []
let done = 0
async function worker(queue) {
  while (queue.length) {
    const it = queue.shift()
    const v = await verifyQuestion(it)
    if (v) all.push(v)
    done++
    if (done % 20 === 0 || !queue.length) console.log(`  [${done}/${items.length}] reviewed`)
  }
}
const queue = [...items]
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)))

// Dump raw verdicts first — a report-formatting bug must never lose the work.
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT.replace(/\.md$/, '.json'), JSON.stringify(all, null, 2))

const cell = (x) => String(x ?? '—').replace(/\|/g, '\\|').replace(/\n/g, ' ')
const flagged = all.filter((v) => v.verdict === 'flag' || v.verdict === 'error')
const high = flagged.filter((v) => v.severity === 'high')
const L = ['# Question-bank review — adversarial correctness pass', '',
  `_Second-model (${MODEL}) re-solved every question. Git-ignored._`, '',
  `- Questions reviewed: **${all.length}**`,
  `- Flagged: **${flagged.length}** (high severity / wrong maths: **${high.length}**)`, '']
if (high.length) {
  L.push('## 🔴 High severity — wrong maths / unreachable answer', '', '| Question | Topic | Issue | Correct answer |', '|---|---|---|---|')
  for (const v of high) L.push(`| ${cell(v.id)} | ${cell(v.topic)} | ${cell(v.issue)} | ${cell(v.correct_answer)} |`)
  L.push('')
}
const low = flagged.filter((v) => v.severity !== 'high')
if (low.length) {
  L.push('## 🟡 Low severity — likely subtopic-code / minor', '', '| Question | Topic | Issue |', '|---|---|---|')
  for (const v of low) L.push(`| ${cell(v.id)} | ${cell(v.topic)} | ${cell(v.issue)} |`)
  L.push('')
}
if (!flagged.length) L.push('✅ No correctness issues flagged.')
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, L.join('\n') + '\n')
console.log(`\nReviewed ${all.length} questions · flagged ${flagged.length} (${high.length} high). Report: ${OUT}`)
