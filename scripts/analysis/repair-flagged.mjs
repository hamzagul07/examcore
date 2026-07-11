#!/usr/bin/env node
// Self-repair pass: for each HIGH-severity flagged question, ask the model to
// produce a CORRECTED version addressing the examiner's objection, validate it
// (marks reconcile, no escaped-$), then RE-VERIFY it with an independent call.
// Only apply the fix if the corrected question passes re-verification.
// Usage: node scripts/analysis/repair-flagged.mjs <subject> [apply]
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const ROOT = '/Users/hamzagul/Documents/examcore'
const SUBJ = process.argv[2] || 'maths-aa'
const APPLY = process.argv[3] === 'apply'
const REV = path.join(ROOT, `docs/course-upgrade/reference-derived/qbank-review-${SUBJ}.json`)
const MODEL = 'gemini-2.5-pro'
const SUBJECT_NAMES = { 'maths-aa': 'Mathematics: Analysis and Approaches', physics: 'Physics', biology: 'Biology', chemistry: 'Chemistry' }
const NAME = SUBJECT_NAMES[SUBJ] || SUBJ

const env = (k) => (fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1] ?? '').trim().replace(/^["']|["']$/g, '')
const PROJECT = env('GOOGLE_CLOUD_PROJECT'), LOCATION = env('GOOGLE_CLOUD_LOCATION')
const SA = JSON.parse(fs.readFileSync(env('GOOGLE_APPLICATION_CREDENTIALS'), 'utf8'))
let _t = null, _e = 0
async function token() {
  const now = Math.floor(Date.now() / 1000); if (_t && now < _e - 120) return _t
  const b = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url')
  const u = `${b({ alg: 'RS256', typ: 'JWT' })}.${b({ iss: SA.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`
  const s = crypto.sign('RSA-SHA256', Buffer.from(u), SA.private_key).toString('base64url')
  const r = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${u}.${s}` })).json()
  _t = r.access_token; _e = now + 3600; return _t
}
function repairJson(s) { const V = '"\\/bfnrtu'; let o = '', S = false; for (let i = 0; i < s.length; i++) { const c = s[i]; if (S) { if (c === '\\') { const n = s[i + 1] ?? ''; if (V.includes(n)) { o += c + n; i++ } else o += '\\\\'; continue } if (c === '"') { S = false; o += c; continue } if (c === '\n') { o += '\\n'; continue } if (c === '\r') { o += '\\r'; continue } if (c === '\t') { o += '\\t'; continue } o += c; continue } if (c === '"') S = true; o += c } return o }
const parse = (r) => { try { return JSON.parse(r) } catch { return JSON.parse(repairJson(r)) } }
async function call(sys, user, maxTok = 8000) {
  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`
  for (let a = 1; a <= 4; a++) {
    let res
    try { res = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${await token()}`, 'content-type': 'application/json' }, body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: [{ role: 'user', parts: [{ text: user }] }], generationConfig: { temperature: 0.2, maxOutputTokens: maxTok, responseMimeType: 'application/json' } }) }) }
    catch (e) { if (a === 4) throw e; await new Promise((r) => setTimeout(r, 2000 * a)); continue }
    if (res.status === 429) { await new Promise((r) => setTimeout(r, 4000 * a)); continue }
    if (!res.ok) throw new Error(`${res.status}`)
    return parse(((await res.json()).candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '').replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim())
  }
  throw new Error('rate-limited')
}

const REPAIR_SYS = `You are an expert IB ${NAME} examiner FIXING one flawed draft practice question. British English, original content.
You get the question, its mark scheme, its model answer, and an examiner's objection. Produce a CORRECTED version of the SAME question that resolves the objection:
- If the model answer / mark scheme has a wrong value or rounding, fix it.
- If the QUESTION itself is flawed (impossible, ambiguous), minimally adjust the prompt so it is valid and well-posed.
- Keep the same subtopic, difficulty, marks total and id.
Rules: markScheme entry marks MUST sum to "marks"; modelAnswer must reach the stated answer; NEVER put \\$ inside $...$; KaTeX only in $...$.
Return ONLY the corrected question object: {"id","prompt","marks","commandTerm","difficulty","syllabusRef","paper","calculator","markScheme":[{"text","marks"}],"modelAnswer"}`

const VERIFY_SYS = `You are a meticulous IB ${NAME} examiner. Solve this ONE question yourself and check the model answer.
Return ONLY {"verdict":"ok"|"flag","issue":"...or null"}. Flag only for a genuine mathematical/scientific error.`

const verdicts = JSON.parse(fs.readFileSync(REV, 'utf8'))
const high = verdicts.filter((v) => v.verdict === 'flag' && v.severity === 'high')
// Map id -> [{file, index}] (an id can exist in both hl and sl)
const byId = new Map()
for (const dir of fs.readdirSync(path.join(ROOT, 'content/courses')).filter((d) => d.startsWith(`ib-${SUBJ}`))) {
  const full = path.join(ROOT, 'content/courses', dir)
  if (!fs.statSync(full).isDirectory()) continue
  for (const f of fs.readdirSync(full)) {
    if (!f.endsWith('.pilot.json')) continue
    const d = JSON.parse(fs.readFileSync(path.join(full, f), 'utf8'))
    ;(d.questionBank ?? []).forEach((q, i) => { if (!byId.has(q.id)) byId.set(q.id, []); byId.get(q.id).push({ file: path.join(full, f), i }) })
  }
}
function reconciles(q) { return q?.markScheme?.length && q.markScheme.reduce((s, m) => s + (m.marks || 0), 0) === q.marks && !/\\\$/.test(JSON.stringify(q)) }

console.log(`Repairing ${high.length} high-severity ${SUBJ} flags${APPLY ? '' : ' (DRY RUN)'}…\n`)
let fixed = 0, skipped = 0
for (const v of high) {
  const locs = byId.get(v.id)
  if (!locs) { console.log(`  ? ${v.id}: not found`); skipped++; continue }
  try {
    const { file, i } = locs[0]
    if (!fs.existsSync(file)) { console.log(`  ? ${v.id}: file missing (wrong branch?)`); skipped++; continue }
    const lesson = JSON.parse(fs.readFileSync(file, 'utf8'))
    const orig = lesson.questionBank[i]
    const user = `QUESTION:\n${JSON.stringify(orig, null, 1)}\n\nEXAMINER OBJECTION: ${v.issue}\nStated answer was: ${v.stated_answer}. A correct answer is: ${v.correct_answer ?? v.your_answer}.\nReturn the corrected question.`
    const corrected = await call(REPAIR_SYS, user)
    if (!reconciles(corrected)) { console.log(`  ✗ ${v.id}: correction failed validation`); skipped++; continue }
    const check = await call(VERIFY_SYS, `Check this question:\n${JSON.stringify(corrected, null, 1)}`, 2000)
    if (check.verdict !== 'ok') { console.log(`  ⚠ ${v.id}: correction still flagged (${String(check.issue).slice(0, 60)}) — left for human`); skipped++; continue }
    for (const loc of locs) {
      const l = JSON.parse(fs.readFileSync(loc.file, 'utf8'))
      l.questionBank[loc.i] = { ...l.questionBank[loc.i], ...corrected, id: l.questionBank[loc.i].id }
      if (APPLY) fs.writeFileSync(loc.file, JSON.stringify(l, null, 2))
    }
    console.log(`  ✓ ${v.id}: repaired + re-verified${locs.length > 1 ? ` (×${locs.length})` : ''}`)
    fixed++
  } catch (e) { console.log(`  ✗ ${v.id}: ${String(e).slice(0, 60)}`); skipped++ }
}
console.log(`\nRepaired ${fixed} · skipped/left-for-human ${skipped}. ${APPLY ? 'APPLIED.' : 'DRY RUN — re-run with "apply".'}`)
