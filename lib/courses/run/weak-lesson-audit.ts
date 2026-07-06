import fs from 'fs'
import path from 'path'
import { getSyllabusSubjectCodes, getSyllabusSubjectName } from '@/lib/syllabi'
import {
  verifyPublishedLessonJson,
  type PublishedLessonValidationResult,
} from './verify-published-lesson'

export type WeakLessonRow = {
  filePath: string
  topicCode: string | null
  title: string | null
  status: string | null
  issueCodes: string[]
  issues: PublishedLessonValidationResult['issues']
}

export type SubjectWeakLessonSummary = {
  subjectCode: string
  subjectName: string
  checked: number
  passed: number
  failed: number
  failPct: number
  dominantWeakness: string | null
  weaknessCounts: Record<string, number>
  failures: WeakLessonRow[]
}

export type WeakLessonAuditReport = {
  runAt: string
  mode: 'auditStrict'
  totalChecked: number
  totalPassed: number
  totalFailed: number
  overallFailPct: number
  subjects: SubjectWeakLessonSummary[]
  rankedByNeed: Array<{
    subjectCode: string
    failPct: number
    failed: number
    checked: number
    dominantWeakness: string | null
  }>
}

function shouldSkipDir(name: string): boolean {
  return name.startsWith('_') || name.startsWith('.')
}

function shouldSkipFile(name: string): boolean {
  if (!name.endsWith('.json')) return true
  if (name.endsWith('.pilot.json') || name.endsWith('.shadow.json')) return true
  if (name.startsWith('_') || name.startsWith('.')) return true
  return false
}

function isExistingPublishedLesson(status: string | undefined): boolean {
  return status === 'premium' || status === 'published'
}

function walkExistingLessons(
  subjectCode: string,
  projectRoot: string
): Array<{ rel: string; abs: string }> {
  const root = path.join(projectRoot, 'content', 'courses', subjectCode)
  const out: Array<{ rel: string; abs: string }> = []
  if (!fs.existsSync(root)) return out

  const walk = (dir: string) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, ent.name)
      if (ent.isDirectory()) {
        if (shouldSkipDir(ent.name)) continue
        walk(abs)
        continue
      }
      if (shouldSkipFile(ent.name)) continue
      out.push({
        rel: path.relative(projectRoot, abs).split(path.sep).join('/'),
        abs,
      })
    }
  }

  walk(root)
  return out
}

function dominantWeakness(counts: Record<string, number>): string | null {
  let best: string | null = null
  let bestN = 0
  for (const [code, n] of Object.entries(counts)) {
    if (n > bestN) {
      best = code
      bestN = n
    }
  }
  return best
}

function auditSubject(
  subjectCode: string,
  projectRoot: string
): SubjectWeakLessonSummary {
  const subjectName = getSyllabusSubjectName(subjectCode) ?? subjectCode
  const files = walkExistingLessons(subjectCode, projectRoot)
  const failures: WeakLessonRow[] = []
  const weaknessCounts: Record<string, number> = {}
  let checked = 0
  let passed = 0

  for (const { rel, abs } of files) {
    let raw: unknown
    try {
      raw = JSON.parse(fs.readFileSync(abs, 'utf8'))
    } catch {
      failures.push({
        filePath: rel,
        topicCode: null,
        title: null,
        status: null,
        issueCodes: ['json_parse'],
        issues: [
          {
            code: 'json_parse',
            message: 'Invalid JSON',
            severity: 'error',
          },
        ],
      })
      weaknessCounts.json_parse = (weaknessCounts.json_parse ?? 0) + 1
      checked += 1
      continue
    }

    const status = (raw as { status?: string }).status
    if (!isExistingPublishedLesson(status)) continue

    checked += 1
    const result = verifyPublishedLessonJson(raw, rel, subjectCode, {
      auditStrict: true,
    })

    if (result.ok) {
      passed += 1
      continue
    }

    const errorCodes = result.issues
      .filter((i) => i.severity === 'error')
      .map((i) => i.code)

    for (const code of errorCodes) {
      weaknessCounts[code] = (weaknessCounts[code] ?? 0) + 1
    }

    failures.push({
      filePath: rel,
      topicCode: result.topicCode,
      title: (raw as { title?: string }).title ?? null,
      status: status ?? null,
      issueCodes: errorCodes,
      issues: result.issues.filter((i) => i.severity === 'error'),
    })
  }

  const failed = failures.length
  return {
    subjectCode,
    subjectName,
    checked,
    passed,
    failed,
    failPct: checked === 0 ? 0 : Math.round((failed / checked) * 1000) / 10,
    dominantWeakness: dominantWeakness(weaknessCounts),
    weaknessCounts,
    failures: failures.sort((a, b) => a.filePath.localeCompare(b.filePath)),
  }
}

export function auditWeakLessons(opts: {
  subjectCode?: string
  all?: boolean
  projectRoot?: string
}): WeakLessonAuditReport {
  const projectRoot = opts.projectRoot ?? process.cwd()
  const codes = opts.subjectCode
    ? [opts.subjectCode]
    : opts.all
      ? getSyllabusSubjectCodes()
      : []

  const subjects = codes
    .map((code) => auditSubject(code, projectRoot))
    .filter((s) => s.checked > 0)
    .sort((a, b) => a.subjectCode.localeCompare(b.subjectCode))

  const totalChecked = subjects.reduce((n, s) => n + s.checked, 0)
  const totalFailed = subjects.reduce((n, s) => n + s.failed, 0)
  const totalPassed = totalChecked - totalFailed

  const rankedByNeed = subjects
    .map((s) => ({
      subjectCode: s.subjectCode,
      failPct: s.failPct,
      failed: s.failed,
      checked: s.checked,
      dominantWeakness: s.dominantWeakness,
    }))
    .sort((a, b) => {
      if (b.failPct !== a.failPct) return b.failPct - a.failPct
      return b.failed - a.failed
    })

  return {
    runAt: new Date().toISOString(),
    mode: 'auditStrict',
    totalChecked,
    totalPassed,
    totalFailed,
    overallFailPct:
      totalChecked === 0 ? 0 : Math.round((totalFailed / totalChecked) * 1000) / 10,
    subjects,
    rankedByNeed,
  }
}

const ISSUE_LABELS: Record<string, string> = {
  hollow_worked_example: 'hollow/templated worked example',
  missing_numeric_worked_example: 'no numeric worked example',
  no_substantive_worked_example: 'thin worked example',
  min_worked_examples: 'too few worked examples',
  min_flashcards: 'insufficient flashcards',
  min_heading_groups: 'thin section depth',
  low_coverage_score: 'low syllabus coverage',
  katex_parse_error: 'KaTeX issues',
  schema_invalid: 'schema invalid',
  missing_analogy: 'missing STEM analogy',
  empty_worked_example: 'empty worked example',
  json_parse: 'invalid JSON',
}

export function formatWeakLessonReportText(report: WeakLessonAuditReport): string {
  const lines: string[] = []
  lines.push('WEAK-LESSON AUDIT (read-only, auditStrict)')
  lines.push(
    `Checked ${report.totalChecked} existing premium/published lessons — ${report.totalPassed} pass, ${report.totalFailed} fail (${report.overallFailPct}%)`
  )
  lines.push('')

  lines.push('=== RANKED BY IMPROVEMENT NEED ===')
  for (const row of report.rankedByNeed) {
    const label = row.dominantWeakness
      ? ISSUE_LABELS[row.dominantWeakness] ?? row.dominantWeakness
      : '—'
    lines.push(
      `${row.subjectCode}: ${row.failed}/${row.checked} fail (${row.failPct}%) — dominant: ${label}`
    )
  }
  lines.push('')

  for (const subj of report.subjects) {
    if (!subj.failed) continue
    lines.push(
      `=== ${subj.subjectCode} ${subj.subjectName} — ${subj.failed}/${subj.checked} fail (${subj.failPct}%) ===`
    )
    const counts = Object.entries(subj.weaknessCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([code, n]) => `${ISSUE_LABELS[code] ?? code}: ${n}`)
    lines.push(`Weakness mix: ${counts.join(', ')}`)
    lines.push('')

    for (const f of subj.failures) {
      lines.push(`${f.filePath}  [${f.topicCode ?? '?'}] ${f.title ?? ''}`)
      for (const code of f.issueCodes) {
        lines.push(`  • ${ISSUE_LABELS[code] ?? code}`)
      }
    }
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}

export function writeWeakLessonAuditReport(
  report: WeakLessonAuditReport,
  projectRoot: string = process.cwd()
): string {
  const stamp = report.runAt.replace(/[:.]/g, '-')
  const rel = path.join(
    'docs/content-generation/runs',
    `${stamp}-weak_lesson_audit-all.json`
  )
  const abs = path.join(projectRoot, rel)
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, `${JSON.stringify(report, null, 2)}\n`)
  return rel
}
