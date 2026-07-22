#!/usr/bin/env node
/**
 * Report live native diagram coverage per subject (runtime resolution incl. aliases).
 *   npx tsx scripts/audit-diagram-coverage.mjs
 *   npx tsx scripts/audit-diagram-coverage.mjs --subject 9618
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const PROJECT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const subjectArg =
  process.argv.find((a) => a.startsWith('--subject='))?.split('=')[1] ??
  (process.argv.includes('--subject') ? process.argv[process.argv.indexOf('--subject') + 1] : null)

/**
 * Every subject with lessons on disk, not a hand-maintained list.
 *
 * This was pinned to six Cambridge codes and reported "100% coverage" — while
 * measuring 318 of 1,721 lessons. A hardcoded list silently stops covering
 * whatever is added after it, which for an audit is the one thing it must not
 * do: the number it prints was read as a statement about the whole catalogue.
 */
function discoverSubjects() {
  const root = path.join(PROJECT, 'content/courses')
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) =>
      fs.readdirSync(path.join(root, name)).some((f) => f.endsWith('.json'))
    )
    .sort()
}

const subjects =
  subjectArg && subjectArg !== 'all' ? [subjectArg] : discoverSubjects()

const { hasLessonLiveDiagram } = await import('../lib/courses/lesson-diagrams.ts')

let grandTotal = 0
let grandLive = 0

for (const subject of subjects) {
  const lessonsDir = path.join(PROJECT, `content/courses/${subject}`)
  if (!fs.existsSync(lessonsDir)) {
    console.log(`${subject}: no lessons directory`)
    continue
  }

  const slugs = fs
    .readdirSync(lessonsDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort()

  const live = slugs.filter((s) => hasLessonLiveDiagram(s))
  const missing = slugs.filter((s) => !hasLessonLiveDiagram(s))

  grandTotal += slugs.length
  grandLive += live.length

  const pct = slugs.length ? Math.round((live.length / slugs.length) * 100) : 0
  console.log(`${subject} lessons: ${slugs.length}`)
  console.log(`  Live native:   ${live.length} (${pct}%)`)
  console.log(`  Missing:       ${missing.length}`)

  if (missing.length) {
    const shown = missing.slice(0, 5)
    console.log('  Missing slugs:')
    for (const slug of shown) console.log(`    - ${slug}`)
    if (missing.length > shown.length) {
      console.log(`    …and ${missing.length - shown.length} more (--subject ${subject} to list them)`)
    }
  }
  console.log('')
}

if (subjects.length > 1) {
  const pct = grandTotal ? Math.round((grandLive / grandTotal) * 100) : 0
  console.log(`All subjects: ${grandLive}/${grandTotal} live (${pct}%)`)
}

if (grandLive < grandTotal) process.exit(1)
