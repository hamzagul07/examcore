#!/usr/bin/env node
// Focused question-bank generator: authors questionBank + subtopics onto an
// EXISTING lesson (keeps its prose) and writes <slug>.pilot.json.
// Validates: 4 questions, mark schemes reconcile. (Escaped-$ in math is no
// longer rejected — the course renderer handles currency in math.)
// Usage: node scripts/analysis/gen-question-bank.mjs <courseSlug> [topicPrefix] [dry]
//   e.g.  ib-maths-aa-hl 1        (Maths AA HL, topic group 1)
//         ib-physics-hl d dry     (Physics HL, topic group D, dry run)
//         ib-biology-sl           (Biology SL, all topics)
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

// Subject registry — display name + family (drives the marking-style guidance).
const SUBJECTS = {
  'ib-maths-aa': { name: 'Mathematics: Analysis and Approaches', family: 'math' },
  'ib-maths-ai': { name: 'Mathematics: Applications and Interpretation', family: 'math' },
  'ib-physics': { name: 'Physics', family: 'science' },
  'ib-biology': { name: 'Biology', family: 'science' },
  'ib-chemistry': { name: 'Chemistry', family: 'science' },
}

const [, , COURSE = 'ib-maths-aa-hl', PREFIX = '', DRY = ''] = process.argv
const ROOT = '/Users/hamzagul/Documents/examcore'
const DIR = path.join(ROOT, `content/courses/${COURSE}`)
const SUBJECT = COURSE // already `ib-…-hl|sl`; the marking profile code
const LEVEL = COURSE.endsWith('-sl') ? 'SL' : 'HL'
const BASE = COURSE.replace(/-(hl|sl)$/, '')
const SUBJ = SUBJECTS[BASE] || { name: BASE.replace(/^ib-/, ''), family: 'science' }
if (!fs.existsSync(DIR)) { console.error(`no course dir: ${DIR}`); process.exit(1) }
// Route through Vertex AI (the app's real backend) — the raw GEMINI_API_KEY
// path is dead. Try models in order to survive a single model's removal.
const MODELS = ['gemini-2.5-pro', 'gemini-2.5-flash']

const env = (k) => (fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8')
  .match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1] ?? '').trim().replace(/^["']|["']$/g, '')
const PROJECT = env('GOOGLE_CLOUD_PROJECT') || 'quantum-pilot-475321-k7'
const LOCATION = env('GOOGLE_CLOUD_LOCATION') || 'us-central1'
const SA = JSON.parse(fs.readFileSync(env('GOOGLE_APPLICATION_CREDENTIALS'), 'utf8'))

let _tok = null, _tokExp = 0
async function getToken() {
  const now = Math.floor(Date.now() / 1000)
  if (_tok && now < _tokExp - 120) return _tok
  const b64u = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url')
  const claim = { iss: SA.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }
  const unsigned = `${b64u({ alg: 'RS256', typ: 'JWT' })}.${b64u(claim)}`
  const sig = crypto.sign('RSA-SHA256', Buffer.from(unsigned), SA.private_key).toString('base64url')
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${unsigned}.${sig}` })
  const j = await r.json()
  if (!j.access_token) throw new Error(`token mint failed: ${JSON.stringify(j).slice(0, 160)}`)
  _tok = j.access_token; _tokExp = now + 3600
  return _tok
}

const familyGuide = SUBJ.family === 'math'
  ? `- Command terms: Find, Show that, Calculate, Hence, Solve, Determine. Mark labels: IB M1 (method) / A1 (accuracy) / R1 (reasoning) / AG (answer given).
- The modelAnswer must correctly reach the answer stated in the markScheme. Double-check ALL arithmetic.
- Mix P1 (calculator:false) and P2 (calculator:true).`
  : `- Command terms: State, Outline, Describe, Explain, Calculate, Determine, Deduce, Suggest, Compare. Each mark = ONE distinct creditable point (idea, correct step, unit, or comparison).
- Include units and correct significant figures in numerical answers; use real ${SUBJ.name} contexts and data.
- Calculator is normally allowed (calculator:true); vary difficulty from single-mark recall to multi-mark extended response.`

const SYS = `You are an expert IB ${SUBJ.name} (${LEVEL}) examiner and question author.
Author an ORIGINAL practice question bank for ONE syllabus topic. British English. Never copy past-paper text.

Output ONLY valid JSON (no markdown fences) of the form:
{
  "subtopics": [ { "code": "<official IB sub-topic code>", "title": "official sub-topic statement", "detail": "one-line elaboration, KaTeX $...$ ok" } ],
  "questionBank": [
    { "id": "slug-q1", "prompt": "question, KaTeX $...$ for any maths", "marks": 4,
      "commandTerm": "<IB command term>", "difficulty": "foundation|standard|challenge",
      "syllabusRef": "<official IB sub-topic code>", "paper": "P1|P2", "calculator": false,
      "markScheme": [ { "text": "(M1) ...", "marks": 1 }, { "text": "(A1) ...", "marks": 1 } ],
      "modelAnswer": "full worked solution, KaTeX $...$" }
  ]
}

HARD RULES:
- EXACTLY 4 questions: one 'foundation', two 'standard', one 'challenge'.
- Each question's markScheme entry marks MUST sum EXACTLY to that question's "marks".
${familyGuide}
- 3-4 subtopics using the REAL official IB sub-topic codes for this topic and level.
- Currency is fine: write amounts as escaped \\$ (e.g. \\$50) — the renderer displays \\$ correctly inside and outside $...$ math.
- Escape backslashes for JSON. KaTeX only inside $...$.`

// Repair the two common LLM-JSON failures inside string values:
// invalid backslash escapes (LaTeX like \cos) and raw control chars.
function repairJson(s) {
  const valid = '"\\/bfnrtu'
  let out = '', inStr = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inStr) {
      if (c === '\\') {
        const n = s[i + 1] ?? ''
        if (valid.includes(n)) { out += c + n; i++ } else { out += '\\\\' }
        continue
      }
      if (c === '"') { inStr = false; out += c; continue }
      if (c === '\n') { out += '\\n'; continue }
      if (c === '\r') { out += '\\r'; continue }
      if (c === '\t') { out += '\\t'; continue }
      out += c; continue
    }
    if (c === '"') { inStr = true }
    out += c
  }
  return out
}

function parseLenient(raw) {
  try { return JSON.parse(raw) } catch { return JSON.parse(repairJson(raw)) }
}

async function callGemini(userPrompt) {
  const body = {
    systemInstruction: { parts: [{ text: SYS }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: { temperature: 0.5, maxOutputTokens: 20000, responseMimeType: 'application/json' },
  }
  const token = await getToken()
  let lastErr = ''
  for (const model of MODELS) {
    const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/google/models/${model}:generateContent`
    const res = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) {
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? ''
      return text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    }
    lastErr = `${model} → ${res.status}: ${(await res.text()).slice(0, 120)}`
    if (res.status !== 404) break // 404 = model gone → try next; other errors → stop
  }
  throw new Error(`Vertex all models failed: ${lastErr}`)
}

function validate(obj, slug) {
  const errs = []
  const qs = obj.questionBank
  if (!Array.isArray(qs) || qs.length !== 4) errs.push(`need exactly 4 questions (got ${qs?.length})`)
  for (const q of qs ?? []) {
    const sum = (q.markScheme ?? []).reduce((s, m) => s + (m.marks || 0), 0)
    if (sum !== q.marks) errs.push(`${q.id}: scheme sums ${sum} ≠ marks ${q.marks}`)
    if (!q.modelAnswer) errs.push(`${q.id}: no modelAnswer`)
    // `\$` (escaped currency) is no longer rejected — normalizeCourseText now
    // rewrites `\$` inside math to `\text{\textdollar}` and neutralises bare
    // currency `$`, so currency renders correctly (see katex-rendering fix).
  }
  if (!Array.isArray(obj.subtopics) || obj.subtopics.length < 3) errs.push('need ≥3 subtopics')
  return errs
}

async function genTopic(file) {
  const lesson = JSON.parse(fs.readFileSync(file, 'utf8'))
  const slug = lesson.slug
  // Resume-friendly: skip topics that already have a valid bank.
  const existing = file.replace(/\.json$/, '.pilot.json')
  if (fs.existsSync(existing)) {
    try {
      const prev = JSON.parse(fs.readFileSync(existing, 'utf8'))
      if (prev.questionBank?.length) return { slug, ok: true, n: prev.questionBank.length, dst: path.basename(existing) + ' (skipped, exists)' }
    } catch { /* regenerate */ }
  }
  const user = `Topic ${lesson.topicCode} — ${lesson.title} (IB ${SUBJ.name} ${LEVEL}).
Use "id" values like "${slug}-q1" … "${slug}-q4".
Author the question bank + subtopics JSON now.`
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const raw = await callGemini(user + (attempt > 1 ? `\n\nPrevious attempt failed validation. Fix and return valid JSON.` : ''))
      const obj = parseLenient(raw)
      const errs = validate(obj, slug)
      if (errs.length) { if (attempt === 3) return { slug, ok: false, errs }; continue }
      lesson.subtopics = obj.subtopics
      lesson.questionBank = obj.questionBank
      lesson.status = 'pilot'
      lesson.generatorVersion = 'qbank-gen-1'
      const dst = file.replace(/\.json$/, '.pilot.json')
      if (!DRY) fs.writeFileSync(dst, JSON.stringify(lesson, null, 2))
      return { slug, ok: true, n: obj.questionBank.length, dst: path.basename(dst) }
    } catch (e) {
      if (attempt === 3) return { slug, ok: false, errs: [String(e).slice(0, 160)] }
    }
  }
}

const pfx = PREFIX.toLowerCase()
const files = fs.readdirSync(DIR)
  .filter((f) => f.endsWith('.json') && !f.endsWith('.pilot.json') && (!pfx || f.toLowerCase().startsWith(`${pfx}-`)))
  .sort()
  .map((f) => path.join(DIR, f))

console.log(`Generating question banks: ${COURSE}${pfx ? ` group ${PREFIX.toUpperCase()}` : ' (all)'} — ${files.length} topics${DRY ? ' (DRY RUN)' : ''}\n`)
for (const f of files) {
  const r = await genTopic(f)
  if (r.ok) console.log(`  ✓ ${r.slug}: ${r.n} questions -> ${r.dst}`)
  else console.log(`  ✗ ${r.slug}: ${r.errs.join('; ')}`)
}
console.log('\nDone. NOTE: generated content needs human review before leaving pilot status.')
