import {
  getSyllabusByCode,
  getSyllabusSubjectCodes,
  getSyllabusSubjectName,
  hasSyllabusTree,
} from '@/lib/syllabi'
import { topicToLessonSlug } from '@/lib/courses/slug'
import { inventoryLessonsForSubject } from './lesson-inventory'

export type TopicCoverageStatus = 'complete' | 'pilot' | 'missing'

export type TopicCoverageRow = {
  topicCode: string
  topicName: string
  expectedSlug: string
  status: TopicCoverageStatus
  lessonStatus?: string
  lessonPath?: string
}

export type SubjectCoverageReport = {
  subjectCode: string
  subjectName: string
  totalTopics: number
  complete: number
  pilot: number
  missing: number
  coveragePct: number
  rows: TopicCoverageRow[]
  missingTopics: TopicCoverageRow[]
}

function classifyInventoryStatus(
  lessonStatus: string | undefined
): TopicCoverageStatus {
  if (!lessonStatus) return 'missing'
  if (lessonStatus === 'premium' || lessonStatus === 'published') return 'complete'
  if (lessonStatus === 'pilot') return 'pilot'
  return 'missing'
}

export function auditSubjectCoverage(subjectCode: string): SubjectCoverageReport | null {
  if (!hasSyllabusTree(subjectCode)) return null

  const topics = getSyllabusByCode(subjectCode)
  const subjectName = getSyllabusSubjectName(subjectCode) ?? subjectCode
  if (!topics?.length) return null

  const inventory = inventoryLessonsForSubject(subjectCode)
  const rows: TopicCoverageRow[] = topics.map((topic) => {
    const expectedSlug = topicToLessonSlug(topic.code, topic.name)
    const found = inventory.get(topic.code)
    const status = classifyInventoryStatus(found?.status)
    return {
      topicCode: topic.code,
      topicName: topic.name,
      expectedSlug,
      status,
      lessonStatus: found?.status,
      lessonPath: found?.relativePath,
    }
  })

  const complete = rows.filter((r) => r.status === 'complete').length
  const pilot = rows.filter((r) => r.status === 'pilot').length
  const missing = rows.filter((r) => r.status === 'missing').length

  return {
    subjectCode,
    subjectName,
    totalTopics: rows.length,
    complete,
    pilot,
    missing,
    coveragePct:
      rows.length === 0 ? 0 : Math.round((complete / rows.length) * 1000) / 10,
    rows,
    missingTopics: rows.filter((r) => r.status === 'missing'),
  }
}

export function auditCoverage(opts: {
  subjectCode?: string
  all?: boolean
}): SubjectCoverageReport[] {
  const codes = opts.subjectCode
    ? [opts.subjectCode]
    : opts.all
      ? getSyllabusSubjectCodes()
      : []

  const reports: SubjectCoverageReport[] = []
  for (const code of codes) {
    const report = auditSubjectCoverage(code)
    if (report) reports.push(report)
  }
  return reports.sort((a, b) => a.subjectCode.localeCompare(b.subjectCode))
}

export function formatCoverageReportText(reports: SubjectCoverageReport[]): string {
  const lines: string[] = []
  for (const r of reports) {
    lines.push(
      `${r.subjectCode} ${r.subjectName}: ${r.complete}/${r.totalTopics} complete (${r.coveragePct}%), ${r.pilot} pilot, ${r.missing} missing`
    )
    if (r.missingTopics.length > 0 && r.missingTopics.length <= 40) {
      for (const m of r.missingTopics) {
        lines.push(`  MISSING  ${m.topicCode}  ${m.topicName}`)
      }
    } else if (r.missingTopics.length > 40) {
      for (const m of r.missingTopics.slice(0, 20)) {
        lines.push(`  MISSING  ${m.topicCode}  ${m.topicName}`)
      }
      lines.push(`  … and ${r.missingTopics.length - 20} more missing topics`)
    }
    lines.push('')
  }
  return lines.join('\n').trimEnd()
}

export function coverageRunFailed(reports: SubjectCoverageReport[]): boolean {
  return reports.some((r) => r.missing > 0)
}
