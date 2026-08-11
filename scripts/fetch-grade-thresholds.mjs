#!/usr/bin/env node
/**
 * Fetch Cambridge grade-threshold PDFs and turn them into session JSON for
 * scripts/ingest-grade-threshold-session.mjs.
 *
 *   node scripts/fetch-grade-thresholds.mjs --codes 9709,9700 --out tmp/thresholds
 *   node scripts/fetch-grade-thresholds.mjs --all --out tmp/thresholds
 *
 * Output is written with "draft": true, which the ingest script refuses to
 * accept. That is deliberate: a wrong boundary is worse than a missing one,
 * because students make remark decisions on these numbers. Check a couple of
 * rows against the PDF, then pass --verified (or delete the draft flag) and
 * ingest.
 *
 * Requires pdftotext (poppler): brew install poppler
 *
 * Only the "Component grade thresholds" table is read. The syllabus-grade
 * tables further down the PDF list weighted component *combinations*
 * ("11, 31, 41, 51") and are a different shape, so rows there never match the
 * Component pattern below.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const INDEX_URL =
  'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-advanced/cambridge-international-as-and-a-levels/grade-threshold-tables/june-2026/'
const ORIGIN = 'https://www.cambridgeinternational.org'
const SESSION = 'June 2026'

function parseArgs(argv) {
  const args = { codes: null, all: false, out: 'tmp/thresholds', verified: false }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--all') args.all = true
    else if (a === '--verified') args.verified = true
    else if (a === '--codes') args.codes = argv[++i].split(',').map((s) => s.trim())
    else if (a === '--out') args.out = argv[++i]
  }
  return args
}

function requirePdftotext() {
  try {
    execFileSync('pdftotext', ['-v'], { stdio: 'ignore' })
  } catch {
    console.error('pdftotext not found. Install poppler:  brew install poppler')
    process.exit(1)
  }
}

/** Map syllabus code -> absolute PDF url, straight off the index page. */
async function loadIndex() {
  const res = await fetch(INDEX_URL)
  if (!res.ok) throw new Error(`index fetch failed: ${res.status}`)
  const html = await res.text()
  const hrefs = html.match(
    /\/Images\/\d+-[a-z0-9-]*june-2026-grade-threshold-table\.pdf/gi
  )
  if (!hrefs) throw new Error('no threshold PDF links found — page structure may have changed')

  const byCode = new Map()
  for (const href of new Set(hrefs)) {
    const code = href.match(/-(\d{4})-june-2026/)?.[1]
    if (code) byCode.set(code, ORIGIN + href)
  }
  return byCode
}

/**
 * Rows look like:
 *   Component 11           75           59         48        37        26           15
 * i.e. code, max raw mark, then A B C D E. A* is never awarded per component.
 */
function parseComponents(text) {
  const rows = []
  const skipped = []
  const seen = new Set()

  for (const line of text.split('\n')) {
    if (!/^\s*Component\s/.test(line)) continue
    const m = line.match(
      /^\s*Component\s+([0-9A-Z]+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$/
    )
    if (!m) {
      // Only flag things shaped like a data row: "Component <code> <number>…".
      // Column headers and the prose caption ("Component grade thresholds for
      // syllabus 9702 …") also begin with "Component" and are not failures.
      // Anything that IS shaped like a row but will not parse — a dash where a
      // threshold should be — must be surfaced rather than silently dropped.
      if (/^\s*Component\s+[0-9A-Z]{1,3}\s+\d/.test(line)) skipped.push(line.trim())
      continue
    }
    const [, component, max, A, B, C, D, E] = m
    if (seen.has(component)) continue // continuation pages repeat nothing, but be safe
    seen.add(component)
    rows.push({
      component,
      paper: `Paper ${component[0]}`,
      max: Number(max),
      thresholds: { A: Number(A), B: Number(B), C: Number(C), D: Number(D), E: Number(E) },
    })
  }

  rows.sort((a, b) => a.component.localeCompare(b.component, undefined, { numeric: true }))
  return { rows, skipped }
}

function sanity(code, rows) {
  const problems = []
  for (const r of rows) {
    const t = r.thresholds
    if (t.A > r.max) problems.push(`${code} c${r.component}: A (${t.A}) exceeds max (${r.max})`)
    // Thresholds must fall monotonically A > B > C > D > E.
    const seq = [t.A, t.B, t.C, t.D, t.E]
    for (let i = 1; i < seq.length; i++) {
      if (seq[i] > seq[i - 1]) {
        problems.push(`${code} c${r.component}: thresholds not descending (${seq.join(' ')})`)
        break
      }
    }
  }
  return problems
}

async function main() {
  const args = parseArgs(process.argv)
  requirePdftotext()

  const index = await loadIndex()
  console.log(`Index: ${index.size} June 2026 threshold PDFs available.\n`)

  const codes = args.all ? [...index.keys()].sort() : args.codes
  if (!codes?.length) {
    console.error('Pass --codes 9709,9700 or --all')
    process.exit(1)
  }

  fs.mkdirSync(args.out, { recursive: true })
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'thresholds-'))
  const problems = []

  for (const code of codes) {
    const url = index.get(code)
    if (!url) {
      console.log(`  ${code}  — no June 2026 PDF on the index page`)
      continue
    }

    const res = await fetch(url)
    if (!res.ok) {
      console.log(`  ${code}  — download failed (${res.status})`)
      continue
    }
    const pdf = path.join(tmp, `${code}.pdf`)
    fs.writeFileSync(pdf, Buffer.from(await res.arrayBuffer()))

    const text = execFileSync('pdftotext', ['-layout', pdf, '-'], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    })
    const { rows, skipped } = parseComponents(text)
    problems.push(...sanity(code, rows))

    const session = {
      session: SESSION,
      sourceUrl: url,
      components: rows,
    }
    if (!args.verified) session.draft = true

    fs.writeFileSync(
      path.join(args.out, `${code}.session.json`),
      JSON.stringify(session, null, 2) + '\n'
    )
    console.log(
      `  ${code}  ${String(rows.length).padStart(3)} components${skipped.length ? `  (${skipped.length} unparsed rows)` : ''}`
    )
    for (const s of skipped) console.log(`         ? ${s}`)
  }

  fs.rmSync(tmp, { recursive: true, force: true })

  if (problems.length) {
    console.log('\nSanity check failed — do not ingest these:')
    for (const p of problems) console.log(`  ! ${p}`)
    process.exit(1)
  }

  console.log(`\nWrote to ${args.out}/`)
  console.log(
    args.verified
      ? 'Marked verified. Ingest with scripts/ingest-grade-threshold-session.mjs.'
      : 'Marked draft. Spot-check against the PDFs, then re-run with --verified.'
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
