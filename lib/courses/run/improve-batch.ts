import fs from 'fs'
import path from 'path'
import { runMetadataBackfill } from './metadata-backfill'
import { runMechanicalFixes } from './mechanical-fixes'
import { auditWeakLessons } from './weak-lesson-audit'
import {
  failingLessonPathsFromAudit,
  rejectedRegenPathsFromBatchLog,
  runLessonImproveBatch,
  type LessonImproveBatchReport,
} from './lesson-improve'
import {
  analyzeFailureSplit,
  formatFailureSplitReport,
} from './lesson-improve-routing'
import { runVisualConsolidation } from './visual-consolidation'

export type ImprovePipelineReport = {
  runAt: string
  job1: ReturnType<typeof runMetadataBackfill>
  auditAfterJob1: ReturnType<typeof auditWeakLessons>
  job2: ReturnType<typeof runMechanicalFixes>
  auditAfterJob2: ReturnType<typeof auditWeakLessons>
  failureSplit?: ReturnType<typeof analyzeFailureSplit>
  visualConsolidation?: ReturnType<typeof runVisualConsolidation>
  job3?: LessonImproveBatchReport
  auditAfterJob3?: ReturnType<typeof auditWeakLessons>
}

function writePipelineLog(projectRoot: string, report: ImprovePipelineReport): string {
  const rel = path.join(
    'docs/content-generation/runs',
    `${report.runAt.replace(/[:.]/g, '-')}-improve_pipeline-all.json`
  )
  const abs = path.join(projectRoot, rel)
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, `${JSON.stringify(report, null, 2)}\n`)
  return rel
}

export async function runImprovePipeline(opts: {
  projectRoot?: string
  skipJob3?: boolean
  job3Only?: boolean
  job3RetryRejects?: boolean
  job3RetryFrom?: string
  job3Limit?: number
  subjectCode?: string
  excludeSubjectCodes?: string[]
}): Promise<ImprovePipelineReport> {
  const projectRoot = opts.projectRoot ?? process.cwd()

  if (opts.job3Only || opts.job3RetryRejects) {
    const auditBefore = auditWeakLessons({ all: true, projectRoot })
    const failureSplit = analyzeFailureSplit(auditBefore)

    if (opts.job3RetryRejects) {
      const batchPath =
        opts.job3RetryFrom ??
        'docs/content-generation/runs/2026-07-05T22-34-58-001Z-improve_pipeline-all.json'
      const paths = rejectedRegenPathsFromBatchLog(batchPath, projectRoot)
      console.error(`Job 3 retry: ${paths.length} rejected lessons from prior batch`)
      console.error('')

      const job3 = await runLessonImproveBatch({
        projectRoot,
        relPaths: paths,
        promoteIfBetter: true,
        limit: opts.job3Limit,
      })
      const auditAfterJob3 = auditWeakLessons({ all: true, projectRoot })
      const report: ImprovePipelineReport = {
        runAt: new Date().toISOString(),
        job1: { runAt: '', scanned: 0, updated: 0, skipped: 0, results: [] },
        auditAfterJob1: auditBefore,
        job2: { runAt: '', scanned: 0, updated: 0, katexFixed: 0, schemaFixed: 0, files: [] },
        auditAfterJob2: auditBefore,
        failureSplit,
        job3,
        auditAfterJob3,
      }
      writePipelineLog(projectRoot, report)
      return report
    }

    console.error(formatFailureSplitReport(failureSplit))
    console.error('')

    const visualConsolidation = runVisualConsolidation({
      projectRoot,
      relPaths: failureSplit.visualPaths,
    })
    if (visualConsolidation.updated || visualConsolidation.flagged) {
      console.error(
        `Visual consolidation: ${visualConsolidation.updated} fixed, ${visualConsolidation.flagged} flagged for manual review`
      )
      console.error('')
    }

    const auditForJob3 =
      visualConsolidation.updated > 0
        ? auditWeakLessons({ all: true, projectRoot })
        : auditBefore

    const paths = failingLessonPathsFromAudit(auditForJob3, {
      excludeReviewRequired: false,
      excludeSubjectCodes: opts.excludeSubjectCodes,
      subjectCode: opts.subjectCode,
    })

    if (opts.subjectCode) {
      console.error(
        `Job 3 scope: ${paths.length} regeneration-eligible lessons for ${opts.subjectCode}`
      )
      console.error('')
    }

    const job3 = await runLessonImproveBatch({
      projectRoot,
      relPaths: paths,
      promoteIfBetter: true,
      limit: opts.job3Limit,
    })
    const auditAfterJob3 = auditWeakLessons({ all: true, projectRoot })
    const report: ImprovePipelineReport = {
      runAt: new Date().toISOString(),
      job1: { runAt: '', scanned: 0, updated: 0, skipped: 0, results: [] },
      auditAfterJob1: auditBefore,
      job2: { runAt: '', scanned: 0, updated: 0, katexFixed: 0, schemaFixed: 0, files: [] },
      auditAfterJob2: auditForJob3,
      failureSplit,
      visualConsolidation,
      job3,
      auditAfterJob3,
    }
    writePipelineLog(projectRoot, report)
    return report
  }

  const job1 = runMetadataBackfill({ projectRoot })
  const auditAfterJob1 = auditWeakLessons({ all: true, projectRoot })

  const job2 = runMechanicalFixes({ projectRoot })
  const auditAfterJob2 = auditWeakLessons({ all: true, projectRoot })

  const report: ImprovePipelineReport = {
    runAt: new Date().toISOString(),
    job1,
    auditAfterJob1,
    job2,
    auditAfterJob2,
  }

  if (opts.skipJob3) {
    writePipelineLog(projectRoot, report)
    return report
  }

  const paths = failingLessonPathsFromAudit(auditAfterJob2, {
    excludeReviewRequired: false,
    excludeSubjectCodes: opts.excludeSubjectCodes,
    subjectCode: opts.subjectCode,
  })

  const job3 = await runLessonImproveBatch({
    projectRoot,
    relPaths: paths,
    promoteIfBetter: true,
    limit: opts.job3Limit,
  })

  report.job3 = job3
  report.auditAfterJob3 = auditWeakLessons({ all: true, projectRoot })
  writePipelineLog(projectRoot, report)
  return report
}

export function formatPipelineSummary(report: ImprovePipelineReport): string {
  const lines: string[] = []
  lines.push('IMPROVE PIPELINE SUMMARY')
  lines.push('')
  lines.push(
    `Job 1 metadata backfill: ${report.job1.updated} updated / ${report.job1.scanned} scanned`
  )
  lines.push(
    `  ? Audit: ${report.auditAfterJob1.totalPassed}/${report.auditAfterJob1.totalChecked} pass (${report.auditAfterJob1.overallFailPct}% fail)`
  )
  lines.push(
    `Job 2 mechanical fixes: ${report.job2.updated} updated (${report.job2.katexFixed} KaTeX, ${report.job2.schemaFixed} schema) / ${report.job2.scanned} scanned`
  )
  lines.push(
    `  ? Audit: ${report.auditAfterJob2.totalPassed}/${report.auditAfterJob2.totalChecked} pass (${report.auditAfterJob2.overallFailPct}% fail)`
  )
  if (report.job3) {
    lines.push(
      `Job 3 depth improve: ${report.job3.promoted} promoted, ${report.job3.draftOnly} draft-only (review_required), ${report.job3.rejected} rejected, ${report.job3.skipped} skipped / ${report.job3.processed} processed`
    )
    if (report.auditAfterJob3) {
      lines.push(
        `  ? Audit: ${report.auditAfterJob3.totalPassed}/${report.auditAfterJob3.totalChecked} pass (${report.auditAfterJob3.overallFailPct}% fail)`
      )
    }
  }
  return lines.join('\n')
}
