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

const ALL_SUBJECTS = ['9702', '9700', '9701', '9709', '9231', '9618']
const subjects = subjectArg && subjectArg !== 'all' ? [subjectArg] : ALL_SUBJECTS

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
    console.log('  Missing slugs:')
    for (const slug of missing) console.log(`    - ${slug}`)
  }
  console.log('')
}

if (subjects.length > 1) {
  const pct = grandTotal ? Math.round((grandLive / grandTotal) * 100) : 0
  console.log(`All subjects: ${grandLive}/${grandTotal} live (${pct}%)`)
}

if (grandLive < grandTotal) process.exit(1)
