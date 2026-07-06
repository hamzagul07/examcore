import fs from 'fs'
import path from 'path'
import { auditWeakLessons } from './weak-lesson-audit'
import {
  analyzeFailureSplit,
  classifyLessonFailure,
  type FailureRoute,
} from './lesson-improve-routing'

export type StructuralBacklogReport = {
  runAt: string
  totalFailed: number
  manualKatex: number
  other: number
  lessons: Array<{
    filePath: string
    subjectCode: string
    topicCode: string
    issueCodes: string[]
    route: FailureRoute
  }>
}

export function buildStructuralBacklog(opts: {
  projectRoot?: string
}): StructuralBacklogReport {
  const projectRoot = opts.projectRoot ?? process.cwd()
  const audit = auditWeakLessons({ all: true, projectRoot })
  const split = analyzeFailureSplit(audit)

  const lessons: StructuralBacklogReport['lessons'] = []
  for (const subj of audit.subjects) {
    for (const f of subj.failures) {
      const route = classifyLessonFailure(f.issueCodes)
      if (route === 'regeneration' || route === 'visual_consolidation') continue
      lessons.push({
        filePath: f.filePath,
        subjectCode: subj.subjectCode,
        topicCode: f.topicCode,
        issueCodes: f.issueCodes,
        route,
      })
    }
  }

  return {
    runAt: new Date().toISOString(),
    totalFailed: audit.totalFailed,
    manualKatex: split.manualKatex,
    other: split.other,
    lessons,
  }
}

export function writeStructuralBacklog(projectRoot: string): string {
  const report = buildStructuralBacklog({ projectRoot })
  const rel = path.join(
    'docs/content-generation/runs',
    `${report.runAt.replace(/[:.]/g, '-')}-structural-backlog.json`
  )
  const abs = path.join(projectRoot, rel)
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, `${JSON.stringify(report, null, 2)}\n`)
  return rel
}
