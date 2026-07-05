import path from 'path'
import type { SubjectCoverageReport } from './syllabus-coverage'
import type { PublishedLessonValidationResult } from './verify-published-lesson'
import { createGuardedWriter } from './guardrail'

export type RunSummary = {
  runType: string
  status: 'passed' | 'failed' | 'partial'
  startedAt: string
  finishedAt: string
  subjectCode?: string
  failureReport?: Record<string, unknown>
  summary?: Record<string, unknown>
}

export function writeRunLog(
  runType: string,
  payload: {
    status: RunSummary['status']
    subjectCode?: string
    summary?: Record<string, unknown>
    failureReport?: Record<string, unknown>
  }
): string | null {
  if (payload.status === 'passed') {
    return null
  }

  const startedAt = new Date().toISOString()
  const stamp = startedAt.replace(/[:.]/g, '-')
  const slug = payload.subjectCode ?? 'all'
  const rel = path.join(
    'docs/content-generation/runs',
    `${stamp}-${runType}-${slug}.json`
  )

  const writer = createGuardedWriter()
  process.env.COURSE_AUTONOMY = '1'

  const body: RunSummary = {
    runType,
    status: payload.status,
    startedAt,
    finishedAt: new Date().toISOString(),
    subjectCode: payload.subjectCode,
    summary: payload.summary,
    failureReport: payload.failureReport,
  }

  writer.writeFile(rel, `${JSON.stringify(body, null, 2)}\n`)
  return rel
}

export function buildCoverageFailureReport(
  reports: SubjectCoverageReport[]
): Record<string, unknown> {
  return {
    subjects: reports.map((r) => ({
      subjectCode: r.subjectCode,
      missing: r.missing,
      coveragePct: r.coveragePct,
      missingTopics: r.missingTopics.map((t) => ({
        code: t.topicCode,
        name: t.topicName,
        expectedSlug: t.expectedSlug,
      })),
    })),
  }
}

export function buildVerifyFailureReport(
  results: PublishedLessonValidationResult[]
): Record<string, unknown> {
  return {
    files: results
      .filter((r) => !r.ok)
      .map((r) => ({
        path: r.filePath,
        topicCode: r.topicCode,
        issues: r.issues.filter((i) => i.severity === 'error'),
      })),
  }
}
