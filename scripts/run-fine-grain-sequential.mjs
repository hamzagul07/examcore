#!/usr/bin/env node
/**
 * Sprint B.1 — sequential fine-grain extraction with backoff between subjects.
 * Run: node scripts/run-fine-grain-sequential.mjs
 */

import { spawn } from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SYLLABI_DIR = join(ROOT, 'lib', 'syllabi')
const REPORT_PATH = join(SYLLABI_DIR, 'FINE_GRAIN_RUN.json')

const SUBJECT_ORDER = [
  { code: '9700', name: 'Biology', target: [150, 250], priority: true },
  { code: '9702', name: 'Physics', target: [130, 200], priority: true },
  { code: '9701', name: 'Chemistry', target: [130, 200], priority: true },
  { code: '9708', name: 'Economics', target: [100, 180], priority: true },
  { code: '9489', name: 'History', target: [50, 150], priority: true },
  { code: '9990', name: 'Psychology', target: [80, 150], priority: true },
  { code: '9618', name: 'Computer Science', target: [80, 140], priority: true },
  { code: '9706', name: 'Accounting', target: [60, 120], priority: true },
  { code: '9231', name: 'Further Mathematics', target: [80, 150], priority: true },
  { code: '9609', name: 'Business', target: [80, 180], skip: 'in_range' },
  { code: '9699', name: 'Sociology', target: [50, 100], priority: false },
  { code: '9084', name: 'Law', target: [60, 120], skip: 'marginal' },
  { code: '9488', name: 'Islamic Studies', target: [35, 70], skip: 'marginal' },
  { code: '9607', name: 'Media Studies', target: [30, 70], skip: 'marginal' },
]

const RETRY_WAITS_MS = [0, 60_000, 120_000]
const POST_SUCCESS_WAIT_MS = 30_000
const MAX_RUNTIME_MS = 90 * 60 * 1000

function leafCount(code) {
  const path = join(SYLLABI_DIR, `${code}.json`)
  if (!existsSync(path)) return 0
  const data = JSON.parse(readFileSync(path, 'utf8'))
  return data.topics?.length ?? 0
}

function inRange(count, [min, max]) {
  return count >= min && count <= max
}

function runExtract(code) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        join(ROOT, 'scripts', 'extract-syllabi.mjs'),
        '--force',
        '--fine-grain',
        '--subject',
        code,
      ],
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], env: process.env }
    )
    let out = ''
    child.stdout.on('data', (d) => {
      out += d.toString()
      process.stdout.write(d)
    })
    child.stderr.on('data', (d) => {
      out += d.toString()
      process.stderr.write(d)
    })
    child.on('close', (exitCode) => {
      const failed =
        /ERROR:|parse_error|503|fetch failed|UNAVAILABLE|RESOURCE_EXHAUSTED/i.test(
          out
        ) || exitCode !== 0
      const ok =
        !failed && /→\s*(clean|needs_review):/i.test(out) && exitCode === 0
      resolve({ ok, failed, exitCode, out })
    })
  })
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function extractOne(subject, startedAt) {
  const before = leafCount(subject.code)
  let attempts = 0
  let lastError = null
  let success = false

  for (let i = 0; i < RETRY_WAITS_MS.length; i++) {
    if (Date.now() - startedAt > MAX_RUNTIME_MS) {
      lastError = 'time budget exceeded'
      break
    }
    if (RETRY_WAITS_MS[i] > 0) {
      console.log(
        `\n[${subject.code}] waiting ${RETRY_WAITS_MS[i] / 1000}s before retry ${i + 1}…`
      )
      await sleep(RETRY_WAITS_MS[i])
    }
    attempts++
    console.log(`\n========== ${subject.code} ${subject.name} (attempt ${attempts}/3) ==========`)
    const result = await runExtract(subject.code)
    if (result.ok) {
      success = true
      break
    }
    lastError = result.out.slice(-400) || `exit ${result.exitCode}`
  }

  const after = leafCount(subject.code)
  const rangeOk = inRange(after, subject.target)

  let finalState = 'failed'
  if (success) {
    finalState = rangeOk ? 'in_range' : 'still_coarse'
  }

  return {
    code: subject.code,
    name: subject.name,
    before,
    after,
    target: subject.target,
    attempts,
    success,
    finalState,
    rangeOk,
    lastError: success ? null : lastError,
  }
}

async function main() {
  const startedAt = Date.now()
  const results = []
  let priorityAllOk = true

  for (const subject of SUBJECT_ORDER) {
    if (Date.now() - startedAt > MAX_RUNTIME_MS) {
      console.log('\n⏱ Max runtime reached — stopping.')
      break
    }

    const before = leafCount(subject.code)
    if (subject.skip === 'in_range' && inRange(before, subject.target)) {
      console.log(`\n[${subject.code}] SKIP — already in range (${before} leaves)`)
      results.push({
        code: subject.code,
        name: subject.name,
        before,
        after: before,
        target: subject.target,
        attempts: 0,
        success: true,
        finalState: 'skipped_in_range',
        rangeOk: true,
        skipped: true,
      })
      continue
    }

    if (subject.skip === 'marginal' && priorityAllOk === false) {
      console.log(`\n[${subject.code}] SKIP marginal — priority subjects had failures`)
      results.push({
        code: subject.code,
        name: subject.name,
        before,
        after: before,
        target: subject.target,
        attempts: 0,
        success: false,
        finalState: 'skipped_marginal',
        rangeOk: inRange(before, subject.target),
        skipped: true,
      })
      continue
    }

    const row = await extractOne(subject, startedAt)
    results.push(row)
    if (subject.priority && !row.success) priorityAllOk = false

    if (row.success) {
      console.log(`\n[${subject.code}] ✓ done — ${row.before} → ${row.after} leaves. Cooling ${POST_SUCCESS_WAIT_MS / 1000}s…`)
      await sleep(POST_SUCCESS_WAIT_MS)
    }
  }

  const report = {
    ranAt: new Date().toISOString(),
    elapsedMs: Date.now() - startedAt,
    results,
  }
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8')
  console.log(`\nWrote ${REPORT_PATH}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
