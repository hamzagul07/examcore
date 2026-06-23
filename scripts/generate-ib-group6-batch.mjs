#!/usr/bin/env node
/**
 * Generate all Core + Group 6 IB lessons (skips existing files).
 * Usage: node --import tsx scripts/generate-ib-group6-batch.mjs
 */
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SUBJECTS = [
  'ib-tok',
  'ib-extended-essay',
  'ib-cas',
  'ib-visual-arts-hl',
  'ib-visual-arts-sl',
  'ib-theatre-hl',
  'ib-theatre-sl',
  'ib-music-hl',
  'ib-music-sl',
  'ib-film-hl',
  'ib-film-sl',
  'ib-dance-hl',
  'ib-dance-sl',
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
