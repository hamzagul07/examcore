#!/usr/bin/env node
// Build a human-review worksheet for the high-severity MATH flags from the
// adversarial review — pairs each flagged question's full content with the
// verifier's objection + proposed answer, so a person can adjudicate quickly.
import fs from 'node:fs'
import path from 'node:path'

const ROOT = '/Users/hamzagul/Documents/examcore'
// Subject key from argv (e.g. "maths-aa", "physics"); defaults to maths-aa.
const SUBJ = process.argv[2] || 'maths-aa'
const REV = path.join(ROOT, `docs/course-upgrade/reference-derived/qbank-review-${SUBJ}.json`)
const OUT = path.join(ROOT, `docs/course-upgrade/reference-derived/${SUBJ}-flags-worksheet.md`)

const verdicts = JSON.parse(fs.readFileSync(REV, 'utf8'))
const flags = verdicts.filter((v) => v.verdict === 'flag' && v.severity === 'high'
  && !/no response|SyntaxError/.test(v.issue || ''))

// Index questions by id — an id can exist in BOTH hl and sl (shared topics),
// and the raw verdicts don't record the level, so we keep ALL matches and show
// each so the reviewer can pick the variant matching the objection.
const qById = new Map()
const courseDirs = fs.readdirSync(path.join(ROOT, 'content/courses'))
  .filter((d) => d.startsWith(`ib-${SUBJ}`) && fs.statSync(path.join(ROOT, 'content/courses', d)).isDirectory())
for (const dir of courseDirs) {
  const full = path.join(ROOT, 'content/courses', dir)
  for (const f of fs.readdirSync(full)) {
    if (!f.endsWith('.pilot.json')) continue
    const d = JSON.parse(fs.readFileSync(path.join(full, f), 'utf8'))
    for (const q of d.questionBank ?? []) {
      const rec = { q, file: `${dir}/${f}`, level: dir.endsWith('-hl') ? 'HL' : 'SL', title: d.title, topicCode: d.topicCode }
      if (qById.has(q.id)) qById.get(q.id).push(rec); else qById.set(q.id, [rec])
    }
  }
}

const L = ['# Math review worksheet — flagged questions', '',
  '_Each question below was flagged by the adversarial pass (a 2nd model re-solved it). '
  + 'The verifier has BOTH true and false positives — decide each yourself. '
  + 'Tick **Keep** if the current answer is right, **Fix** if it is wrong._', '',
  `**${flags.length} questions to review.**`, '', '---', '']

for (const [i, v] of flags.entries()) {
  const recs = qById.get(v.id)
  if (!recs) continue
  L.push(`## ${i + 1}. \`${v.id}\`${recs.length > 1 ? '  ⚠ exists in both HL & SL — check both' : ''}`, '',
    '**🔎 Verifier objection**', '', '> ' + String(v.issue || '').replace(/\n/g, '\n> '),
    v.correct_answer ? `\n\n**Verifier's proposed answer:** ${v.correct_answer}` : '', '')
  for (const rec of recs) {
    const q = rec.q
    L.push(`### ${rec.level} — ${rec.topicCode} ${rec.title}`, '',
      `- **File:** \`${rec.file}\` · **Marks:** ${q.marks} · ${q.paper ?? ''} · ${q.calculator ? 'calc' : 'no calc'}`, '',
      '**Question**', '', '> ' + q.prompt.replace(/\n/g, '\n> '), '',
      '**Mark scheme**', '', ...q.markScheme.map((m) => `- [${m.marks}] ${m.text}`), '',
      '**Model answer**', '', '> ' + q.modelAnswer.replace(/\n/g, '\n> '), '')
  }
  L.push('**Decision:** ☐ Keep (verifier wrong)   ☐ Fix (verifier right) — corrected answer: ______', '', '---', '')
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, L.join('\n') + '\n')
console.log(`Wrote ${OUT} — ${flags.length} flagged questions.`)
