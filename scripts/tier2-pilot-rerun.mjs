#!/usr/bin/env node
/** Re-run Tier 2 s24 pilots sequentially (avoids 4× parallel Vertex 429s). */
import { spawn } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const subjects = ['9709', '9618', '9706', '9708']

function runSubject(subjectCode) {
  return new Promise((resolve, reject) => {
    const args = [
      'tsx',
      'scripts/bulk-extract-sessions.mjs',
      `--subject=${subjectCode}`,
      '--sessions=s24',
      '--concurrency=2',
      '--global-cost-cap=50',
      '--per-session-cost-cap=50',
      `--progress-log=tmp/bulk-tier2-${subjectCode}.log`,
      `--pid-file=tmp/bulk-tier2-${subjectCode}.pid`,
      '--state-file=tmp/bulk-tier2-state.json',
    ]
    console.log(`\n=== PILOT ${subjectCode} ===`)
    const child = spawn('npx', args, { cwd: ROOT, stdio: 'inherit', shell: true })
    child.on('close', (code) => {
      if (code === 0 || code === 2) resolve(code)
      else reject(new Error(`${subjectCode} exited ${code}`))
    })
  })
}

for (const subject of subjects) {
  await runSubject(subject)
}
console.log('\nAll Tier 2 sequential pilots finished.')
