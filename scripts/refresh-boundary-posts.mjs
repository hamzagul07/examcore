#!/usr/bin/env node
/**
 * Bring the grade-boundary blog posts in line with the ingested data.
 *
 *   node scripts/refresh-boundary-posts.mjs --dry-run
 *   node scripts/refresh-boundary-posts.mjs
 *
 * The posts were written before results and hardcode "threshold tables ~13
 * August" plus a "compare to June 2024/2023 until the 2026 PDF loads" framing.
 * Cambridge published A Level thresholds on 11 August, so those posts now argue
 * against our own calculator, which has the real numbers.
 *
 * Two cases, decided per syllabus by whether we actually hold June 2026 data:
 *
 *   live    (A Level, thresholds ingested) — rewrite to published, and insert
 *           the real component table so the page carries the numbers people
 *           search for instead of pointing away to a tool.
 *   pending (IGCSE / O Level) — results are 18 August, no June 2026 threshold
 *           page exists yet, and Cambridge does not pre-announce threshold
 *           timing. So: correct the wrong 13 August date, invent nothing.
 *
 * The date string appears in six or so places per post (description, intro,
 * quick-answer table, FAQ, cross-link paragraph, summary), so replacement is
 * global rather than per-context. A final scan asserts no stale marker
 * survives anywhere — that check, not the individual patterns, is what
 * guarantees a post is not left half-updated.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = '/Users/hamzagul/Documents/examcore'
const BLOG_DIR = path.join(ROOT, 'content', 'blog')
const DATA_DIR = path.join(ROOT, 'content', 'data', 'grade-boundaries')
const TODAY = '2026-08-11'
const MARKER = '## June 2026 thresholds (official)'

const dryRun = process.argv.includes('--dry-run')
const rx = (s, f = 'g') => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), f)

function june2026(code) {
  const file = path.join(DATA_DIR, `${code}.json`)
  if (!fs.existsSync(file)) return null
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  return (data.sessions ?? []).find(
    (s) => String(s.session).trim().toLowerCase() === 'june 2026'
  )
}

function thresholdTable(session) {
  const rows = session.components.map(
    (c) =>
      `| ${c.component} | ${c.max} | ${c.thresholds.A} | ${c.thresholds.B} | ${c.thresholds.C} | ${c.thresholds.D} | ${c.thresholds.E} |`
  )
  return [
    MARKER,
    '',
    'Verified against the official Cambridge component threshold table for the June 2026 series.',
    '',
    '| Component | Max raw mark | A | B | C | D | E |',
    '|---|---|---|---|---|---|---|',
    ...rows,
    '',
    'Grade A\\* is not awarded on an individual component — it exists only at syllabus level, from the weighted aggregate across the papers you entered.',
    '',
    `Source: [Cambridge June 2026 grade threshold table](${session.sourceUrl}).`,
    '',
  ].join('\n')
}

/** Ordered: longer, context-specific phrasings before the generic date swap. */
const LIVE = [
  ['(**18 August** grades, **~13 August** thresholds)', '(**18 August** grades, thresholds published)'],
  ['publish in August — **grades 11 August 2026**', 'are published — **grades 11 August 2026**'],
  ['for the **June 2026** series publish with Cambridge results season', 'for the **June 2026** series are published'],
  ['grade boundaries for **June 2026** publish in August', 'grade boundaries for **June 2026** are published'],
  ['publish in August — **11 August** for grades on your statement', 'were published on **11 August** — grades on your statement'],
  ['Until then, estimate using marked past papers and recent sessions in the', 'The official component figures are below, and in the'],
  ['Estimate now with marked past papers and the', 'The official component figures are below, and in the'],
  ['Estimate with marked past papers via the', 'The official component figures are below, and in the'],
  ['until the verified June 2026 PDF loads', 'against the official June 2026 table above'],
  ['Until then, marked past papers plus the', 'Every component figure is in the table above, and in the'],
  ['beat rumour spreadsheets', 'so you never need a rumour spreadsheet'],
  ['June 2024/2023', 'June 2026'],
  ['~13 August 2026', '11 August 2026'],
  ['~13 August', '11 August'],
  ['threshold tables around 13 August', 'threshold tables published 11 August'],
  ['around 13 August', 'on 11 August'],
  ['13 August', '11 August'],
  // Tidy the sentences left clumsy by the swaps above (grades and thresholds
  // landed the same day, so the original "X then Y" phrasings now repeat).
  ['grades 11 August, threshold tables 11 August.', 'grades and official component thresholds both published 11 August.'],
  ['were published on **11 August** — grades on your statement, **11 August** for component threshold PDFs.', 'were published on **11 August 2026**, grades and component threshold PDFs together.'],
  ['publish with **11 August** grades and **11 August** threshold PDFs', 'published on **11 August**, grades and threshold PDFs together'],
  ['**Threshold PDFs:** typically **11 August**', '**Threshold PDFs:** published **11 August**'],
  [') using June 2026 so you never need a rumour spreadsheet.', '). No rumour spreadsheet required.'],
  ['Save your component codes when Cambridge publishes the official row.', 'Match your component codes on the statement to the rows above.'],
]

const PENDING = [
  ['(**18 August** grades, **~13 August** thresholds)', '(**18 August** grades, thresholds to follow)'],
  ['Threshold PDFs **~13 August**;', 'Threshold PDFs follow the series release;'],
  ['threshold tables around 13 August', 'threshold tables following the 18 August results'],
  ['~13 August 2026', 'after the 18 August results'],
  ['~13 August', 'after the 18 August results'],
  ['around 13 August', 'after the 18 August results'],
  ['13 August', 'the 18 August results'],
]

/**
 * The wider results-week posts. These were written assuming A Level results
 * were 13 August; they were 11 August, so several state the wrong results day
 * outright rather than merely the wrong threshold date. Phrasing varies too
 * much for a blanket swap, so every edit is spelled out and asserted.
 *
 * Verified: AS & A Level results and component thresholds both 11 Aug 2026;
 * IGCSE / O Level results 18 Aug 2026, thresholds after that with no
 * announced date — so nothing here claims one.
 */
const RESULTS_PAGES = {
  'cambridge-exam-dates-2026.md': [
    ['The results for the May/June 2026 exam series will be released to schools on **13 August 2026**.', 'AS & A Level results for the May/June 2026 series were released on **11 August 2026**, with IGCSE and O Level results following on **18 August 2026**.'],
    ['For the **May/June 2026** series, results will be made available to schools on **Thursday, 13 August 2026**. Students typically receive their results from their school on the same day or shortly after.', 'For the **May/June 2026** series, AS & A Level results were released on **Tuesday, 11 August 2026**, and IGCSE and O Level results follow on **Tuesday, 18 August 2026**. Students typically receive results from their school on the day or shortly after.'],
    ['The key confirmed date is the release of May/June 2026 results on **13 August 2026**.', 'The key confirmed dates are AS & A Level results on **11 August 2026** and IGCSE / O Level results on **18 August 2026**.'],
  ],
  'what-your-cambridge-grades-mean-for-university.md': [
    ['results day on 13 August 2026', 'results day on 11 August 2026'],
  ],
  'cambridge-results-day-august-2026-guide.md': [
    ['| When are threshold PDFs? | **~13 August** (components; before IGCSE grades) |', '| When are threshold PDFs? | **Published 11 August** (A Level components) |'],
    ['Typically **~13 August** for the June series', '**Published 11 August** for the June series'],
    ['AS & A Level **grades** publish **11 August**; **threshold tables** for the series typically follow around **13 August**.', 'AS & A Level **grades** and component **threshold tables** both published on **11 August**.'],
  ],
  'what-to-do-while-waiting-for-cambridge-results.md': [
    ['The wait between Cambridge exams and 13 August 2026 results', 'The wait between Cambridge exams and 11 August 2026 results'],
    ['With results for the June 2026 series released on **13 August 2026**', 'With AS & A Level results for the June 2026 series released on **11 August 2026**'],
    ['the only numbers that matter are the ones released on 13 August.', 'the only numbers that matter are the official ones released on 11 August.'],
    ['Cambridge International will release results to schools on 12 August 2026. You will be able to access your results directly from Cambridge or through your school on **Thursday, 13 August 2026**.', 'You can access your AS & A Level results directly from Cambridge or through your school from **Tuesday, 11 August 2026**.'],
  ],
  'how-to-predict-your-cambridge-grade-before-results-day.md': [
    ['Estimate your Cambridge grade before 13 August 2026', 'Estimate your Cambridge grade before 11 August 2026'],
    ['official thresholds are released on 13 August 2026', 'official thresholds were released on 11 August 2026'],
  ],
  'how-to-talk-to-parents-about-cambridge-results.md': [
    ['before 13 August 2026', 'before 11 August 2026'],
    ['Weeks before the **13 August 2026** results release', 'Weeks before the **11 August 2026** results release'],
  ],
  'cambridge-post-exam-results-prep-2026.md': [
    ['| When are threshold tables? | **~13 August** (A-Level components) |', '| When are threshold tables? | **Published 11 August** (A-Level components) |'],
  ],
  'cambridge-may-june-2026-grade-thresholds-what-to-expect.md': [
    ['| When are **threshold tables** published? | **~13 August** 2026 (component PDFs) |', '| When are **threshold tables** published? | **Published 11 August 2026** (component PDFs) |'],
    ['**O-Level (grades 18 August; thresholds ~13 August):**', '**O-Level (grades 18 August; thresholds follow the results):**'],
    ['**IGCSE (grades 18 August; thresholds ~13 August):**', '**IGCSE (grades 18 August; thresholds follow the results):**'],
  ],
  'how-to-read-cambridge-grade-boundaries.md': [
    ['On results day—for instance, 13 August 2026 for the June 2026 series—Cambridge publishes the threshold tables.', 'On results day—for instance, 11 August 2026 for the June 2026 AS & A Level series—Cambridge publishes the threshold tables.'],
  ],
}

function applyAll(text, pairs) {
  for (const [from, to] of pairs) text = text.replace(rx(from), to)
  return text
}

function bumpUpdated(text) {
  return /^updated:\s/m.test(text)
    ? text.replace(/^updated:\s*.+$/m, `updated: ${TODAY}`)
    : text.replace(/^(---\n[\s\S]*?)(---)/m, `$1updated: ${TODAY}\n$2`)
}

const files = fs
  .readdirSync(BLOG_DIR)
  .filter((f) => /^cambridge-\d{4}-.*grade-boundaries-2026\.md$/.test(f))
  .sort()

let live = 0
let pending = 0
const problems = []

for (const file of files) {
  const code = file.match(/^cambridge-(\d{4})-/)[1]
  const full = path.join(BLOG_DIR, file)
  const original = fs.readFileSync(full, 'utf8')
  const session = june2026(code)

  let text = applyAll(original, session ? LIVE : PENDING)

  if (session && !text.includes(MARKER)) {
    const anchor = '\n## What are grade boundaries?'
    if (text.includes(anchor)) {
      text = text.replace(anchor, `\n${thresholdTable(session)}${anchor}`)
    } else {
      problems.push(`${code}: no anchor to insert the threshold table`)
    }
  }

  text = bumpUpdated(text)

  // The real guarantee: nothing stale survived, and a live post carries numbers.
  // The wrong 13 August date is wrong in both modes. The "estimate until the
  // PDF lands" framing is only stale where the PDF has actually landed — on a
  // pending IGCSE post it is still the truth.
  const stale = session
    ? ['13 August', 'Until then', 'publish in August', 'June 2024/2023']
    : ['13 August']
  for (const s of stale) {
    if (text.includes(s)) problems.push(`${code}: still contains "${s}"`)
  }
  if (session && !text.includes(MARKER)) problems.push(`${code}: live post has no threshold table`)

  if (text !== original) {
    if (!dryRun) fs.writeFileSync(full, text)
    session ? live++ : pending++
  }
}

let wider = 0
for (const [file, pairs] of Object.entries(RESULTS_PAGES)) {
  const full = path.join(BLOG_DIR, file)
  if (!fs.existsSync(full)) {
    problems.push(`${file}: not found`)
    continue
  }
  const original = fs.readFileSync(full, 'utf8')
  let text = original
  for (const [from, to] of pairs) {
    if (!text.includes(from) && !text.includes(to)) {
      problems.push(`${file}: phrase not found → "${from.slice(0, 60)}…"`)
      continue
    }
    text = text.replace(rx(from), to)
  }
  if (text.includes('13 August')) problems.push(`${file}: still contains "13 August"`)
  text = bumpUpdated(text)
  if (text !== original) {
    if (!dryRun) fs.writeFileSync(full, text)
    wider++
  }
}

console.log(`${live} live-threshold posts rewritten (official table inserted)`)
console.log(`${pending} pending posts date-corrected`)
console.log(`${wider} results-week posts corrected (wrong results day / threshold date)`)
if (problems.length) {
  console.log(`\nNeeds a human — ${problems.length} issue(s):`)
  for (const p of problems) console.log(`  ! ${p}`)
  process.exitCode = 1
} else {
  console.log('\nNo stale date or placeholder text survives in any post.')
}
if (dryRun) console.log('Dry run — nothing written.')
