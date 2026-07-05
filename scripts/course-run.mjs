#!/usr/bin/env node
/**
 * Autonomous course build runner ÿ Phase 1.
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
    console.error(
      'lesson_generate is not available until the gated generation commit is deployed.'
    )
    process.exit(1)
  }

  console.error(`Unknown run type: ${opts.type}`)
  console.error('Types: coverage_audit | lesson_verify')
  process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
