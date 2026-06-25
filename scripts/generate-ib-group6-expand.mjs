#!/usr/bin/env node
/**
 * Generate missing lessons for expanded Group 6 syllabi (Dance, Theatre, Music, Film).
 * Usage: node --import tsx scripts/generate-ib-group6-expand.mjs
 */
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SUBJECTS = [
  'ib-dance-hl',
  'ib-dance-sl',
  'ib-theatre-hl',
  'ib-theatre-sl',
  'ib-music-hl',
  'ib-music-sl',
  'ib-film-hl',
  'ib-film-sl',
]

function runSubject(subject) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', 'scripts/generate-ib-fill-gaps.mjs', `--only=${subject}`],
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
  console.log(`\nGroup 6 expand complete in ${mins}m. Failed: ${failed}`)
  process.exit(failed ? 1 : 0)
}

main()
