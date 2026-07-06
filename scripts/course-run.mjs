#!/usr/bin/env node
/**
 * Autonomous course build runner  Phase 1.
 *
 *   pnpm course:run -- --type coverage_audit --code 9702
 *   pnpm course:run -- --type coverage_audit --all
 *   pnpm course:run -- --type lesson_verify --code 9702
 *   pnpm course:run -- --type lesson_generate --code 9702 --missing-only --limit 3
 *
 * Writes require COURSE_AUTONOMY=1 (set automatically for generate).
 * Improvement loop requires COURSE_IMPROVEMENT_LOOP=1 (disabled by default).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(__dirname, '..')

function loadEnvLocal() {
  const envPath = path.join(PROJECT, '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (process.env[k] === undefined) process.env[k] = v
  }
}

function parseArgs(argv) {
  const args = argv.slice(2)
  const get = (name) => {
    const i = args.indexOf(`--${name}`)
    return i === -1 ? null : args[i + 1]
  }
  return {
    type: get('type') ?? 'coverage_audit',
    code: get('code'),
    all: args.includes('--all'),
    strict: args.includes('--strict'),
    missingOnly: args.includes('--missing-only'),
    limit: get('limit') ? parseInt(get('limit'), 10) : null,
    topic: get('topic'),
    dryRun: args.includes('--dry-run'),
    skipJob3: args.includes('--skip-job3'),
    job3Only: args.includes('--job3-only'),
    job3RetryRejects: args.includes('--job3-retry-rejects'),
    job3RetryFrom: get('job3-retry-from'),
    job3Limit: get('job3-limit') ? parseInt(get('job3-limit'), 10) : null,
    excludeSubjectCodes: get('exclude-code')
      ? get('exclude-code').split(',').map((s) => s.trim()).filter(Boolean)
      : [],
  }
}

async function main() {
  const opts = parseArgs(process.argv)

  if (opts.type === 'improvement_cycle') {
    const { assertImprovementLoopEnabled } = await import(
      '../lib/courses/run/guardrail.ts'
    )
    assertImprovementLoopEnabled()
    console.error('Improvement cycle is not implemented in Phase 1.')
    process.exit(1)
  }

  if (opts.type === 'coverage_audit') {
    const { auditCoverage, formatCoverageReportText, coverageRunFailed } =
      await import('../lib/courses/run/syllabus-coverage.ts')
    const { writeRunLog, buildCoverageFailureReport } = await import(
      '../lib/courses/run/run-report.ts'
    )

    if (!opts.code && !opts.all) {
      console.error('coverage_audit requires --code SUBJECT or --all')
      process.exit(1)
    }

    const reports = auditCoverage({
      subjectCode: opts.code ?? undefined,
      all: opts.all,
    })

    if (!reports.length) {
      console.error('No syllabus found for requested subject(s).')
      process.exit(1)
    }

    console.log(formatCoverageReportText(reports))

    const failed = coverageRunFailed(reports)
    if (failed) {
      const logPath = writeRunLog('coverage_audit', {
        status: 'failed',
        subjectCode: opts.code ?? undefined,
        summary: {
          subjects: reports.length,
          totalMissing: reports.reduce((n, r) => n + r.missing, 0),
        },
        failureReport: buildCoverageFailureReport(reports),
      })
      if (logPath) {
        console.error(`\nFailure report: ${logPath}`)
      }
      process.exit(1)
    }

    process.exit(0)
  }

  if (opts.type === 'lesson_verify') {
    const { verifyPublishedLessonJson, formatVerificationFailures } =
      await import('../lib/courses/run/verify-published-lesson.ts')
    const { writeRunLog, buildVerifyFailureReport } = await import(
      '../lib/courses/run/run-report.ts'
    )

    const subjects = opts.code
      ? [opts.code]
      : fs
          .readdirSync(path.join(PROJECT, 'content', 'courses'), {
            withFileTypes: true,
          })
          .filter((d) => d.isDirectory())
          .map((d) => d.name)

    const results = []
    for (const subjectCode of subjects) {
      const root = path.join(PROJECT, 'content', 'courses', subjectCode)
      const walk = (dir) => {
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
          const abs = path.join(dir, ent.name)
          if (ent.isDirectory()) {
            if (ent.name.startsWith('_') || ent.name.startsWith('.')) continue
            walk(abs)
            continue
          }
          if (!ent.name.endsWith('.json')) continue
          if (ent.name.endsWith('.pilot.json') || ent.name.endsWith('.shadow.json')) {
            continue
          }
          if (ent.name.startsWith('_') || ent.name.startsWith('.')) continue
          const rel = path.relative(PROJECT, abs).split(path.sep).join('/')
          let raw
          try {
            raw = JSON.parse(fs.readFileSync(abs, 'utf8'))
          } catch (err) {
            results.push({
              ok: false,
              filePath: rel,
              subjectCode,
              topicCode: null,
              issues: [
                {
                  code: 'json_parse',
                  message: err instanceof Error ? err.message : String(err),
                  severity: 'error',
                },
              ],
            })
            continue
          }
          results.push(
            verifyPublishedLessonJson(raw, rel, subjectCode, {
              strict: opts.strict,
            })
          )
        }
      }
      if (fs.existsSync(root)) walk(root)
    }

    const failed = results.filter((r) => !r.ok)
    if (failed.length) {
      console.error(formatVerificationFailures(results))
      const logPath = writeRunLog('lesson_verify', {
        status: 'failed',
        subjectCode: opts.code ?? undefined,
        summary: {
          checked: results.length,
          failed: failed.length,
        },
        failureReport: buildVerifyFailureReport(results),
      })
      if (logPath) console.error(`\nFailure report: ${logPath}`)
      process.exit(1)
    }

    process.exit(0)
  }

  if (opts.type === 'lesson_generate') {
    loadEnvLocal()
    process.env.COURSE_AUTONOMY = '1'

    const { auditSubjectCoverage } = await import(
      '../lib/courses/run/syllabus-coverage.ts'
    )
    const { createGuardedWriter } = await import('../lib/courses/run/guardrail.ts')
    const { generateLesson } = await import(
      '../lib/courses/generator/generate-lesson.ts'
    )
    const { getSyllabusByCode } = await import('../lib/syllabi/index.ts')
    const { topicToLessonSlug } = await import('../lib/courses/slug.ts')
    const { pilotLessonPath } = await import('../lib/courses/paths.ts')

    if (!opts.code) {
      console.error('lesson_generate requires --code SUBJECT')
      process.exit(1)
    }

    const coverage = auditSubjectCoverage(opts.code)
    if (!coverage) {
      console.error(`No syllabus for ${opts.code}`)
      process.exit(1)
    }

    console.log(
      `Coverage before generate: ${coverage.complete}/${coverage.totalTopics} complete (${coverage.coveragePct}%)`
    )

    let targets = opts.missingOnly
      ? coverage.missingTopics
      : coverage.rows.filter((r) => r.status !== 'complete')

    if (opts.topic) {
      targets = targets.filter((t) => t.topicCode === opts.topic)
    }
    if (opts.limit != null) {
      targets = targets.slice(0, opts.limit)
    }

    if (!targets.length) {
      console.log('Nothing to generate.')
      process.exit(0)
    }

    const topics = getSyllabusByCode(opts.code) ?? []
    const writer = createGuardedWriter()
    let ok = 0
    let fail = 0

    for (const row of targets) {
      const topic = topics.find((t) => t.code === row.topicCode)
      if (!topic) continue
      const paperNumber = String(topic.paper).match(/P(\d+)/i)?.[1] ?? '1'
      const slug = topicToLessonSlug(topic.code, topic.name)

      if (opts.dryRun) {
        console.log(`[dry-run] would generate ${opts.code} ${topic.code} ${slug}`)
        continue
      }

      try {
        const result = await generateLesson({
          subjectCode: opts.code,
          paperNumber,
          topicCode: topic.code,
          persist: false,
          skipAnswerabilityLlm: true,
        })
        const outRel = path
          .relative(PROJECT, pilotLessonPath(opts.code, paperNumber, slug))
          .split(path.sep)
          .join('/')
        writer.writeFile(outRel, `${JSON.stringify(result.lesson, null, 2)}\n`)
        console.log(`OK  ${topic.code}  ${slug}  (${result.attempts} attempt(s))`)
        ok += 1
      } catch (err) {
        console.error(
          `FAIL ${topic.code} ${slug}: ${err instanceof Error ? err.message : String(err)}`
        )
        fail += 1
      }
    }

    if (fail > 0) process.exit(1)
    console.log(`Generated ${ok} lesson(s).`)
    process.exit(0)
  }

  if (opts.type === 'weak_lesson_audit') {
    const { auditWeakLessons, formatWeakLessonReportText, writeWeakLessonAuditReport } =
      await import('../lib/courses/run/weak-lesson-audit.ts')

    if (!opts.code && !opts.all) {
      console.error('weak_lesson_audit requires --code SUBJECT or --all')
      process.exit(1)
    }

    const report = auditWeakLessons({
      subjectCode: opts.code ?? undefined,
      all: opts.all,
      projectRoot: PROJECT,
    })

    console.log(formatWeakLessonReportText(report))
    const logPath = writeWeakLessonAuditReport(report, PROJECT)
    console.error(`\nFull report: ${logPath}`)
    process.exit(report.totalFailed > 0 ? 1 : 0)
  }

  if (opts.type === 'metadata_backfill') {
    const { runMetadataBackfill } = await import('../lib/courses/run/metadata-backfill.ts')
    const { auditWeakLessons } = await import('../lib/courses/run/weak-lesson-audit.ts')
    const report = runMetadataBackfill({ projectRoot: PROJECT })
    const audit = auditWeakLessons({ all: true, projectRoot: PROJECT })
    console.log(
      `Metadata backfill: ${report.updated} updated / ${report.scanned} scanned`
    )
    console.log(
      `Post-backfill audit: ${audit.totalPassed}/${audit.totalChecked} pass (${audit.overallFailPct}% fail)`
    )
    process.exit(0)
  }

  if (opts.type === 'mechanical_fix') {
    const { runMechanicalFixes } = await import('../lib/courses/run/mechanical-fixes.ts')
    const { auditWeakLessons } = await import('../lib/courses/run/weak-lesson-audit.ts')
    const report = runMechanicalFixes({ projectRoot: PROJECT })
    const audit = auditWeakLessons({ all: true, projectRoot: PROJECT })
    console.log(
      `Mechanical fixes: ${report.updated} updated (${report.katexFixed} KaTeX, ${report.schemaFixed} schema) / ${report.scanned} scanned`
    )
    console.log(
      `Post-fix audit: ${audit.totalPassed}/${audit.totalChecked} pass (${audit.overallFailPct}% fail)`
    )
    process.exit(0)
  }

  if (opts.type === 'structural_backlog') {
    const { writeStructuralBacklog } = await import('../lib/courses/run/structural-backlog.ts')
    const rel = writeStructuralBacklog(PROJECT)
    const { buildStructuralBacklog } = await import('../lib/courses/run/structural-backlog.ts')
    const report = buildStructuralBacklog({ projectRoot: PROJECT })
    console.log(`Structural backlog: ${report.manualKatex} manual KaTeX + ${report.other} other = ${report.lessons.length} lessons`)
    console.log(`Written: ${rel}`)
    process.exit(0)
  }

  if (opts.type === 'stubborn_fix') {
    const { runStubbornLessonFixes } = await import('../lib/courses/run/stubborn-lesson-fixes.ts')
    const { auditWeakLessons } = await import('../lib/courses/run/weak-lesson-audit.ts')
    const results = runStubbornLessonFixes({ projectRoot: PROJECT })
    const audit = auditWeakLessons({ all: true, projectRoot: PROJECT })
    const passed = results.filter((r) => r.ok).length
    console.log(`Stubborn fixes: ${passed}/${results.length} now pass audit`)
    for (const r of results) {
      if (!r.ok) console.log(`  FAIL ${r.path}: ${r.issues.join(', ')}`)
    }
    console.log(`Post-fix audit: ${audit.totalPassed}/${audit.totalChecked} pass (${audit.overallFailPct}% fail)`)
    process.exit(passed === results.length ? 0 : 1)
  }

  if (opts.type === 'improve_pipeline') {
    loadEnvLocal()
    const { runImprovePipeline, formatPipelineSummary } = await import(
      '../lib/courses/run/improve-batch.ts'
    )
    const report = await runImprovePipeline({
      projectRoot: PROJECT,
      skipJob3: opts.skipJob3,
      job3Only: opts.job3Only,
      job3RetryRejects: opts.job3RetryRejects,
      job3RetryFrom: opts.job3RetryFrom ?? undefined,
      job3Limit: opts.job3Limit ?? undefined,
      subjectCode: opts.code ?? undefined,
      excludeSubjectCodes: opts.excludeSubjectCodes?.length ? opts.excludeSubjectCodes : undefined,
    })
    console.log(formatPipelineSummary(report))
    process.exit(0)
  }

  console.error(`Unknown run type: ${opts.type}`)
  console.error(
    'Types: coverage_audit | lesson_verify | lesson_generate | weak_lesson_audit | metadata_backfill | mechanical_fix | improve_pipeline | structural_backlog | stubborn_fix'
  )
  process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
