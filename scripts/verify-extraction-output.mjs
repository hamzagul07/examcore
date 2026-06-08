#!/usr/bin/env node
/**
 * Checklist verification for qp_42 / qp_12 extraction dry-runs.
 * Usage: node scripts/verify-extraction-output.mjs [qp42.json] [qp12.json]
 * Or:   node scripts/verify-extraction-output.mjs --live cambridge/9702/s24/qp_42.pdf ...
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

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

function findOutput(prefix) {
  const dir = join(ROOT, 'scripts', 'extraction-output')
  if (!existsSync(dir)) return null
  const match = readdirSync(dir).find((f) => f.startsWith(prefix) && f.endsWith('.json'))
  return match ? join(dir, match) : null
}

function hasRawLatex(text) {
  const issues = []
  if (/\\frac\{/.test(text) && !/\$[^$]*\\frac\{/.test(text)) issues.push('raw \\frac')
  if (/\\Delta/.test(text) && !/\$[^$]*\\Delta/.test(text)) issues.push('raw \\Delta')
  if (/\^[0-9{]/.test(text) && !/\$[^$]*\^/.test(text)) issues.push('raw superscript')
  if (/_[0-9{a-z]/i.test(text) && !/\$[^$]*_/.test(text)) issues.push('raw subscript')
  return issues
}

function isSortablePath(path) {
  return /^\d{2}(\.[a-z](\.[ivx]+)?)?$/.test(path)
}

async function liveParse(pdfPath, flags) {
  const { parseQuestionPaper } = await import('../lib/extraction/pdf-parser.ts')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await supabase.storage.from('paper-pdfs').download(pdfPath)
  if (error || !data) throw new Error(error?.message || 'download failed')
  return parseQuestionPaper({
    pdfBytes: await data.arrayBuffer(),
    sourcePdfPath: pdfPath,
    skipDiagrams: flags.skipDiagrams,
    skipLatexValidation: flags.skipLatexValidation,
  })
}

function verifyP42(result) {
  const qs = result.questions
  const report = { paper: 'qp_42 (P4)', checks: [], anomalies: [] }

  const topLevel = new Set(qs.map((q) => q.question_number.replace(/\(.*$/, '').trim()))
  report.checks.push({
    item: 'Total questions',
    expected: '~10 top-level, 20-40 total rows',
    actual: `${topLevel.size} top-level, ${qs.length} total rows`,
    pass: topLevel.size >= 8 && topLevel.size <= 12 && qs.length >= 15 && qs.length <= 50,
  })

  const paths = qs.map((q) => q.question_path)
  const badPaths = qs.filter((q) => !isSortablePath(q.question_path))
  report.checks.push({
    item: 'Sortable paths (01.a.i)',
    expected: '01.a.i format',
    actual: badPaths.length
      ? `Non-conforming: ${badPaths.slice(0, 5).map((q) => `${q.question_number}→${q.question_path}`).join(', ')}`
      : `Sample: ${paths.slice(0, 5).join(', ')}`,
    pass: badPaths.length === 0,
  })

  const leaves = qs.filter((q) => q.is_leaf)
  const parents = qs.filter((q) => !q.is_leaf)
  const leafNoMarks = leaves.filter((q) => q.marks == null || !Number.isFinite(q.marks))
  const parentWithMarks = parents.filter((q) => q.marks != null)
  report.checks.push({
    item: 'Leaf marks set',
    expected: 'every leaf has numeric marks',
    actual: `${leaves.length} leaves, ${leafNoMarks.length} missing marks`,
    pass: leafNoMarks.length === 0,
  })
  report.checks.push({
    item: 'Parent marks null',
    expected: 'non-leaf marks = null',
    actual: `${parents.length} parents, ${parentWithMarks.length} with marks`,
    pass: parentWithMarks.length === 0,
  })

  const hasParentIdField = qs.some((q) => 'parent_question_id' in q)
  report.checks.push({
    item: 'parent_question_id on parents',
    expected: 'UUID parent_question_id links',
    actual: hasParentIdField ? 'field present' : 'field NOT in parser output (only parent_question_number)',
    pass: false,
  })

  const markSum = leaves.reduce((s, q) => s + (q.marks ?? 0), 0)
  report.checks.push({
    item: 'Sum of leaf marks',
    expected: '≈ 100',
    actual: markSum,
    pass: markSum >= 90 && markSum <= 110,
  })

  const highConf = qs.filter((q) => q.extraction_confidence > 0.85).length
  const pct = qs.length ? Math.round((highConf / qs.length) * 100) : 0
  report.checks.push({
    item: 'extraction_confidence > 0.85',
    expected: '≥90% of questions',
    actual: `${highConf}/${qs.length} (${pct}%)`,
    pass: pct >= 90,
  })

  const latexIssues = qs.filter((q) => hasRawLatex(q.question_text).length > 0)
  report.checks.push({
    item: 'LaTeX $ delimiters',
    expected: 'math wrapped in $...$',
    actual: `${latexIssues.length} questions with raw LaTeX`,
    pass: latexIssues.length === 0,
  })
  if (latexIssues.length) {
    report.anomalies.push(
      ...latexIssues.slice(0, 3).map((q) => ({
        q: q.question_number,
        issues: hasRawLatex(q.question_text),
        preview: q.question_text.slice(0, 120),
      }))
    )
  }

  report.checks.push({
    item: 'Diagrams with question_id',
    expected: 'cropped PNGs linked to questions',
    actual: `${result.diagrams.length} diagrams extracted`,
    pass: result.diagrams.length > 0 && result.diagrams.every((d) => d.question_id != null),
  })

  return report
}

function verifyP12(result) {
  const qs = result.questions
  const report = { paper: 'qp_12 (P1)', checks: [], anomalies: [] }

  const nested = qs.filter((q) => q.depth > 0)
  report.checks.push({
    item: 'Exactly 40 flat questions',
    expected: '40 questions, depth 0',
    actual: `${qs.length} questions, ${nested.length} nested`,
    pass: qs.length === 40 && nested.length === 0,
  })

  const notOneMark = qs.filter((q) => q.marks !== 1)
  report.checks.push({
    item: 'marks = 1 each',
    expected: 'every question marks=1',
    actual: `${notOneMark.length} not equal to 1`,
    pass: notOneMark.length === 0,
  })

  const withTable = qs.filter((q) => q.question_text.includes('| Option | Text |'))
  const withOptionsField = qs.filter((q) => q.options && Object.keys(q.options).length > 0)
  report.checks.push({
    item: 'Options storage',
    expected: 'markdown table or options field',
    actual: `${withTable.length} with table in text, ${withOptionsField.length} with options field`,
    pass: withTable.length >= 35 || withOptionsField.length >= 35,
  })

  const badPaths = qs.filter((q) => !/^\d{2}$/.test(q.question_path))
  report.checks.push({
    item: 'Zero-padded paths 01-40',
    expected: '01..40',
    actual: badPaths.length
      ? `Non-conforming: ${badPaths.slice(0, 5).map((q) => `${q.question_number}→${q.question_path}`).join(', ')}`
      : `Range: ${qs[0]?.question_path}..${qs[qs.length - 1]?.question_path}`,
    pass: badPaths.length === 0,
  })

  return report
}

function verifyFromSummary(json, kind) {
  const report = { paper: json.sourcePdfPath, checks: [], anomalies: [], note: 'Summary JSON only — limited fields' }
  const qs = json.questions ?? []

  if (kind === 'p42') {
    const topLevel = new Set(qs.map((q) => String(q.question_number).replace(/\(.*$/, '')))
    report.checks.push({ item: 'Total rows', actual: `${topLevel.size} top-level, ${qs.length} total`, pass: null })
    report.checks.push({
      item: 'question_path in JSON',
      actual: 'NOT exported in summary (only question_number)',
      pass: false,
    })
    const leaves = qs.filter((q) => q.marks != null)
    const markSum = leaves.reduce((s, q) => s + (q.marks ?? 0), 0)
    report.checks.push({ item: 'Leaf mark sum (rows with marks)', actual: markSum, pass: markSum >= 90 && markSum <= 110 })
    const highConf = qs.filter((q) => q.extraction_confidence > 0.85).length
    const pct = qs.length ? Math.round((highConf / qs.length) * 100) : 0
    report.checks.push({ item: 'confidence > 0.85', actual: `${pct}%`, pass: pct >= 90 })
    report.checks.push({ item: 'diagramCount', actual: json.diagramCount ?? 0, pass: (json.diagramCount ?? 0) > 0 })
    report.checks.push({ item: 'Full question_text for LaTeX audit', actual: 'only question_text_preview (200 chars)', pass: false })
  } else {
    report.checks.push({ item: 'Question count', actual: qs.length, pass: qs.length === 40 })
    const nested = qs.filter((q) => (q.depth ?? 0) > 0)
    report.checks.push({ item: 'Nesting', actual: `${nested.length} nested`, pass: nested.length === 0 })
    report.checks.push({ item: 'marks=1', actual: qs.filter((q) => q.marks !== 1).length + ' failures', pass: qs.every((q) => q.marks === 1) })
    report.checks.push({ item: 'question_path in JSON', actual: 'NOT exported', pass: false })
  }
  return report
}

async function main() {
  loadEnv()
  const args = process.argv.slice(2)

  if (args[0] === '--live') {
    const paths = args.slice(1)
    for (const pdfPath of paths) {
      const kind = pdfPath.includes('qp_12') ? 'p12' : 'p42'
      console.log(`\n=== LIVE PARSE: ${pdfPath} ===\n`)
      const result = await liveParse(pdfPath, {
        skipDiagrams: kind === 'p12',
        skipLatexValidation: false,
      })
      const report = kind === 'p12' ? verifyP12(result) : verifyP42(result)
      printReport(report)
    }
    return
  }

  const p42Path = args[0] || findOutput('cambridge_9702_s24_qp_42')
  const p12Path = args[1] || findOutput('cambridge_9702_s24_qp_12')

  if (!p42Path && !p12Path) {
    console.error('No extraction-output JSON found. Run: pnpm extract:paper cambridge/9702/s24/qp_42.pdf')
    process.exit(1)
  }

  if (p42Path && existsSync(p42Path)) {
    const json = JSON.parse(readFileSync(p42Path, 'utf8'))
    printReport(verifyFromSummary(json, 'p42'))
  }
  if (p12Path && existsSync(p12Path)) {
    const json = JSON.parse(readFileSync(p12Path, 'utf8'))
    printReport(verifyFromSummary(json, 'p12'))
  }
}

function printReport(report) {
  console.log(`\n## ${report.paper}`)
  if (report.note) console.log(`(${report.note})`)
  for (const c of report.checks) {
    const status = c.pass === true ? 'PASS' : c.pass === false ? 'FAIL' : 'N/A'
    console.log(`  [${status}] ${c.item}: ${c.actual}${c.expected ? ` (expected: ${c.expected})` : ''}`)
  }
  if (report.anomalies?.length) {
    console.log('  Anomalies:')
    for (const a of report.anomalies) console.log('   ', JSON.stringify(a))
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
