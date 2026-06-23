#!/usr/bin/env node
/**
 * Generate all Group 1–3 IB lessons (skips existing files).
 * Usage: node --import tsx scripts/generate-ib-group13-batch.mjs
 */
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SUBJECTS = [
  'ib-history-hl',
  'ib-history-sl',
  'ib-geography-hl',
  'ib-geography-sl',
  'ib-english-a-lang-lit-hl',
  'ib-english-a-lang-lit-sl',
  'ib-english-a-literature-hl',
  'ib-english-a-literature-sl',
  'ib-spanish-b-hl',
  'ib-spanish-b-sl',
  'ib-french-b-hl',
  'ib-french-b-sl',
]

function runSubject(subject) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', 'scripts/generate-ib-deep-lesson.mjs', `--subject=${subject}`],
      { cwd: ROOT, stdio: 'inherit', shell: false }
    )
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${subject} exited ${code}`))
    })
  })
}

async function main() {
  const started = Date.now()
  let failed = 0
  for (const subject of SUBJECTS) {
    console.log(`\n========== ${subject} ==========\n`)
    try {
      await runSubject(subject)
    } catch (err) {
      failed++
      console.error(err)
    }
  }
  const mins = Math.round((Date.now() - started) / 60000)
  console.log(`\nBatch complete in ${mins}m. Failed subjects: ${failed}`)
  process.exit(failed ? 1 : 0)
}

main()
