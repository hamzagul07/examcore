#!/usr/bin/env node
/**
 * Report live diagram coverage for 9702.
 *   node scripts/audit-diagram-coverage.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const PROJECT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const LESSONS_DIR = path.join(PROJECT, 'content/courses/9702')

// Parse PILOT_DIAGRAMS keys from lesson-diagrams.ts
const registry = fs.readFileSync(
  path.join(PROJECT, 'lib/courses/lesson-diagrams.ts'),
  'utf8'
)
const customSlugs = [...registry.matchAll(/^\s+'([^']+)':\s*\{/gm)].map((m) => m[1])

// Parse SLUG_FAMILY from diagram-families.ts
const families = fs.readFileSync(
  path.join(PROJECT, 'lib/courses/diagram-families.ts'),
  'utf8'
)
const familySlugs = [...families.matchAll(/^\s+'([^']+)':\s*'/gm)].map((m) => m[1])

const slugs = fs
  .readdirSync(LESSONS_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))

let custom = 0
let family = 0
let fallback = 0

for (const slug of slugs.sort()) {
  if (customSlugs.includes(slug)) custom++
  else if (familySlugs.includes(slug)) family++
  else fallback++
}

console.log(`9702 lessons: ${slugs.length}`)
console.log(`  Custom live:  ${custom}`)
console.log(`  Family live:  ${family}`)
console.log(`  Template only: ${fallback}`)
console.log(`  Live total:   ${custom + family} (${Math.round(((custom + family) / slugs.length) * 100)}%)`)

if (fallback) {
  console.log('\nTemplate-only slugs:')
  for (const slug of slugs) {
    if (!customSlugs.includes(slug) && !familySlugs.includes(slug)) console.log(`  - ${slug}`)
  }
}
