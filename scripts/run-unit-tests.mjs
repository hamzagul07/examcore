import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { spawnSync } from 'node:child_process'

function collectTestFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      collectTestFiles(path, acc)
    } else if (name.endsWith('.test.ts')) {
      acc.push(path)
    }
  }
  return acc
}

const libRoot = join(process.cwd(), 'lib')
const files = collectTestFiles(libRoot).sort()
let failed = 0

for (const file of files) {
  const label = relative(process.cwd(), file)
  console.log(`\n>> ${label}`)
  const result = spawnSync('pnpm', ['exec', 'tsx', file], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) {
    failed++
    console.error(`FAILED ${label}`)
  }
}

const passed = files.length - failed
console.log(`\n${passed}/${files.length} test file(s) passed`)

if (failed > 0) {
  process.exit(1)
}
