#!/usr/bin/env node
/**
 * Report components nothing references.
 *
 * Run: node scripts/find-dead-components.mjs [--paths]
 *
 * Deliberately conservative — it would rather miss dead code than name a file
 * that is actually live, because acting on a false positive deletes working
 * software. A component counts as referenced if ANY other file mentions its
 * import path OR its bare name anywhere, including barrels, tests, scripts and
 * content. That means a file only re-exported from an index.ts and never
 * imported still counts as live, and will not be reported.
 *
 * Prose does not count. Markdown is excluded because sprint reports and design
 * notes name components they no longer use, and treating a mention in an old
 * report as a live reference hid two genuinely dead files. (There is no MDX in
 * this repo; if that changes, .mdx must be scanned as code, since it imports.)
 *
 * What it cannot see, and why the output is a starting point rather than a
 * delete list:
 *   - imports built from template literals, e.g. import(`./${name}`)
 *   - components resolved through a string-keyed registry whose keys do not
 *     match the filename
 * Both are worth grepping for before removing anything. At the time of writing
 * this repo has neither.
 */

import fs from 'node:fs'
import path from 'node:path'

const SEARCH_DIRS = ['app', 'components', 'lib', 'scripts', 'content']
const showPaths = process.argv.includes('--paths')

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p, out)
    else if (/\.(tsx?|mjs|js|json)$/.test(entry.name)) out.push(p)
  }
  return out
}

const files = SEARCH_DIRS.filter((d) => fs.existsSync(d)).flatMap((d) => walk(d))

// Read once. Re-reading per candidate turns this into minutes of IO.
const sources = files.map((f) => [f, fs.readFileSync(f, 'utf8')])

const components = files.filter((f) => f.startsWith('components/') && f.endsWith('.tsx'))

const dead = []
for (const file of components) {
  const base = path.basename(file, '.tsx')
  const alias = '@/' + file.replace(/\.tsx$/, '')
  const nameRe = new RegExp(`\\b${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)

  const referenced = sources.some(
    ([other, src]) =>
      other !== file &&
      (src.includes(alias) ||
        src.includes(`/${base}'`) ||
        src.includes(`/${base}"`) ||
        nameRe.test(src))
  )
  if (!referenced) dead.push(file)
}

if (!dead.length) {
  console.log(`No unreferenced components (${components.length} checked).`)
  process.exit(0)
}

const byArea = new Map()
for (const f of dead) {
  const area = path.dirname(f).replace(/^components\/?/, '') || '(root)'
  byArea.set(area, [...(byArea.get(area) ?? []), f])
}

const lines = dead.reduce(
  (n, f) => n + fs.readFileSync(f, 'utf8').split('\n').length,
  0
)

console.log(
  `${dead.length} unreferenced of ${components.length} components — ${lines} lines\n`
)
for (const [area, list] of [...byArea].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${area} (${list.length})`)
  if (showPaths) for (const f of list) console.log(`    ${f}`)
}
if (!showPaths) console.log('\n  --paths to list files')
