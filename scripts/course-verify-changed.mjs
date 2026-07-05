#!/usr/bin/env node
/**
 * CI gate: verify changed course lesson JSON under content/courses/**.
 * Alert-on-fail-only ÿ exits 0 when nothing changed or all checks pass.
 *
 *   pnpm course:verify-changed
 *   pnpm course:verify-changed -- --base origin/main
 */
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(__dirname, '..')

function parseArgs(argv) {
  const args = argv.slice(2)
  const i = args.indexOf('--base')
  return { base: i === -1 ? 'origin/main' : args[i + 1] }
}

function subjectFromPath(relPath) {
  const parts = relPath.split('/')
  if (parts[0] !== 'content' || parts[1] !== 'courses') return null
  return parts[2] ?? null
}

async function main() {
  const { base } = parseArgs(process.argv)
  let diff
  try {
    diff = execSync(`git diff --name-only --diff-filter=ACMRT ${base}...HEAD -- content/courses/`, {
      cwd: PROJECT,
      encoding: 'utf8',
    }).trim()
  } catch {
    try {
      diff = execSync(`git diff --name-only --diff-filter=ACMRT ${base} HEAD -- content/courses/`, {
        cwd: PROJECT,
        encoding: 'utf8',
      }).trim()
    } catch {
      diff = ''
    }
  }

  const files = diff
    ? diff.split('\n').filter(Boolean).filter((f) => {
        if (!f.endsWith('.json')) return false
        if (f.endsWith('.pilot.json') || f.endsWith('.shadow.json')) return false
        return true
      })
    : []

  if (!files.length) {
    console.log('No changed course lesson files to verify.')
    process.exit(0)
  }

  const { verifyPublishedLessonJson, formatVerificationFailures } = await import(
    '../lib/courses/run/verify-published-lesson.ts'
  )
  const { writeRunLog, buildVerifyFailureReport } = await import(
    '../lib/courses/run/run-report.ts'
  )

  const results = []
  for (const rel of files) {
    const abs = path.join(PROJECT, rel)
    if (!fs.existsSync(abs)) continue
    const subjectCode = subjectFromPath(rel)
    if (!subjectCode) continue
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
      verifyPublishedLessonJson(raw, rel, subjectCode, { strict: true })
    )
  }

  const failed = results.filter((r) => !r.ok)
  if (failed.length) {
    console.error(formatVerificationFailures(results))
    const logPath = writeRunLog('lesson_verify_ci', {
      status: 'failed',
      summary: { checked: results.length, failed: failed.length, base },
      failureReport: buildVerifyFailureReport(results),
    })
    if (logPath) console.error(`Failure report: ${logPath}`)
    process.exit(1)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
