#!/usr/bin/env node
/**
 * Report live diagram coverage per subject.
 *   node scripts/audit-diagram-coverage.mjs
 *   node scripts/audit-diagram-coverage.mjs --subject 9700
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const PROJECT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const subjectArg = process.argv.find((a) => a.startsWith('--subject='))?.split('=')[1]
  ?? (process.argv.includes('--subject') ? process.argv[process.argv.indexOf('--subject') + 1] : null)
const subjects = subjectArg && subjectArg !== 'all' ? [subjectArg] : ['9702', '9700']

const registry = fs.readFileSync(path.join(PROJECT, 'lib/courses/lesson-diagrams.ts'), 'utf8')
const customSlugs = [...registry.matchAll(/^\s+'([^']+)':\s*\{/gm)].map((m) => m[1])

const familiesSrc = fs.readFileSync(path.join(PROJECT, 'lib/courses/diagram-families.ts'), 'utf8')

function parseSlugFamilyBlock(name) {
  const re = new RegExp(`const ${name}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\}`, 'm')
  const block = familiesSrc.match(re)?.[1] ?? ''
  return [...block.matchAll(/^\s+'([^']+)':\s*'/gm)].map((m) => m[1])
}

const familyBySubject = {
  '9702': parseSlugFamilyBlock('SLUG_FAMILY_9702'),
  '9700': parseSlugFamilyBlock('SLUG_FAMILY_9700'),
  '9701': parseSlugFamilyBlock('SLUG_FAMILY_9701'),
}

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

  const familySlugs = familyBySubject[subject] ?? []

  let custom = 0
  let family = 0
  let fallback = 0
  const missing = []

  for (const slug of slugs) {
    if (customSlugs.includes(slug)) custom++
    else if (familySlugs.includes(slug)) family++
    else {
      fallback++
      missing.push(slug)
    }
  }

  const live = custom + family
  grandTotal += slugs.length
  grandLive += live

  console.log(`${subject} lessons: ${slugs.length}`)
  console.log(`  Custom live:   ${custom}`)
  console.log(`  Family live:   ${family}`)
  console.log(`  Template only: ${fallback}`)
  console.log(`  Live total:    ${live} (${slugs.length ? Math.round((live / slugs.length) * 100) : 0}%)`)

  if (missing.length) {
    console.log('  Template-only slugs:')
    for (const slug of missing) console.log(`    - ${slug}`)
  }
  console.log('')
}

if (subjects.length > 1) {
  console.log(`All subjects: ${grandLive}/${grandTotal} live (${grandTotal ? Math.round((grandLive / grandTotal) * 100) : 0}%)`)
}
