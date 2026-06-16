#!/usr/bin/env node
/** Visual coverage audit — native diagrams, embeds, and step specs per subject. */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const contentRoot = path.join(ROOT, 'content/courses')

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function extractSlugMaps(filePath, varName) {
  const src = fs.readFileSync(filePath, 'utf8')
  const re = new RegExp(`const ${varName}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\}`, 'm')
  const m = src.match(re)
  if (!m) return new Set()
  const keys = [...m[1].matchAll(/'([^']+)':/g)].map((x) => x[1])
  return new Set(keys)
}

function extractRecordKeys(filePath, varName) {
  const src = fs.readFileSync(filePath, 'utf8')
  const re = new RegExp(`const ${varName}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\}`, 'm')
  const m = src.match(re)
  if (!m) return new Set()
  const keys = [...m[1].matchAll(/^\s*'([^']+)':/gm)].map((x) => x[1])
  return new Set(keys)
}

function extractAliases(filePath) {
  const src = fs.readFileSync(filePath, 'utf8')
  const m = src.match(/VISUAL_SLUG_ALIASES[^=]*=\s*\{([\s\S]*?)\n\}/m)
  if (!m) return new Map()
  const map = new Map()
  for (const line of m[1].split('\n')) {
    const km = line.match(/^\s*'([^']+)':\s*'([^']+)'/)
    if (km) map.set(km[1], km[2])
  }
  return map
}

function extractEmbedSlugs(filePath) {
  const src = fs.readFileSync(filePath, 'utf8')
  const keys = [...src.matchAll(/^\s*'([^']+)':\s*(?:phetEntry|geogebraEntry|customEntry)/gm)].map((x) => x[1])
  return new Set(keys)
}

function extractDiagramSpecSlugs(filePath) {
  const src = fs.readFileSync(filePath, 'utf8')
  const keys = [...src.matchAll(/^\s*'([^']+)':\s*(?:\{|embedSpec)/gm)].map((x) => x[1])
  return new Set(keys)
}

function extractGeneratedSpecSlugs(filePath) {
  const src = fs.readFileSync(filePath, 'utf8')
  const keys = [...src.matchAll(/^\s*'([^']+)':\s*\{\s*\n\s*steps:/gm)].map((x) => x[1])
  return new Set(keys)
}

const pilot = extractRecordKeys(path.join(ROOT, 'lib/courses/lesson-diagrams.ts'), 'PILOT_DIAGRAMS')
const families = new Set([
  ...extractSlugMaps(path.join(ROOT, 'lib/courses/diagram-families.ts'), 'SLUG_FAMILY_9702'),
  ...extractSlugMaps(path.join(ROOT, 'lib/courses/diagram-families.ts'), 'SLUG_FAMILY_9700'),
  ...extractSlugMaps(path.join(ROOT, 'lib/courses/diagram-families.ts'), 'SLUG_FAMILY_9701'),
  ...extractSlugMaps(path.join(ROOT, 'lib/courses/diagram-families.ts'), 'SLUG_FAMILY_9709'),
  ...extractSlugMaps(path.join(ROOT, 'lib/courses/diagram-families.ts'), 'SLUG_FAMILY_9231'),
  ...extractSlugMaps(path.join(ROOT, 'lib/courses/generated/subject-visuals.ts'), 'SLUG_FAMILY_9706'),
  ...extractSlugMaps(path.join(ROOT, 'lib/courses/generated/subject-visuals.ts'), 'SLUG_FAMILY_9609'),
  ...extractSlugMaps(path.join(ROOT, 'lib/courses/generated/subject-visuals.ts'), 'SLUG_FAMILY_9084'),
  ...extractSlugMaps(path.join(ROOT, 'lib/courses/generated/subject-visuals.ts'), 'SLUG_FAMILY_9699'),
  ...extractSlugMaps(path.join(ROOT, 'lib/courses/generated/subject-visuals.ts'), 'SLUG_FAMILY_9990'),
])
const aliases = extractAliases(path.join(ROOT, 'lib/courses/visual-slug-aliases.ts'))
const embeds = extractEmbedSlugs(path.join(ROOT, 'lib/courses/interactive-embeds.ts'))
const specs = new Set([
  ...extractDiagramSpecSlugs(path.join(ROOT, 'lib/courses/diagram-specs.ts')),
  ...extractGeneratedSpecSlugs(path.join(ROOT, 'lib/courses/generated/subject-visuals.ts')),
])

function resolveSlug(slug) {
  return aliases.get(slug) ?? slug
}

function hasNative(slug) {
  const s = resolveSlug(slug)
  return pilot.has(slug) || pilot.has(s) || families.has(slug) || families.has(s)
}

function hasEmbed(slug, lesson) {
  if (embeds.has(slug) || embeds.has(resolveSlug(slug))) return true
  for (const r of lesson.sections ?? []) {
    if (r.type !== 'resources') continue
    for (const item of r.items ?? []) {
      const u = item.url ?? item.href ?? ''
      if (/phet\.colorado\.edu|geogebra\.org/i.test(u)) return true
    }
  }
  return false
}

function hasSpec(slug) {
  return specs.has(slug) || specs.has(resolveSlug(slug))
}

const codes = fs.readdirSync(contentRoot).filter((c) => fs.statSync(path.join(contentRoot, c)).isDirectory()).sort()

let totalBare = 0
console.log('code\ttotal\tnative\tembed\tspec\tbare')
for (const code of codes) {
  const dir = path.join(contentRoot, code)
  const slugs = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json') && !f.includes('.pilot.'))
    .map((f) => f.replace('.json', ''))
  if (!slugs.length) continue

  let native = 0
  let embed = 0
  let spec = 0
  const bare = []

  for (const slug of slugs) {
    const lesson = readJson(path.join(dir, `${slug}.json`))
    const n = hasNative(slug)
    const e = hasEmbed(slug, lesson)
    const s = hasSpec(slug)
    if (n) native++
    if (e) embed++
    if (s) spec++
    if (!n && !e && !s) bare.push(slug)
  }

  totalBare += bare.length
  console.log(`${code}\t${slugs.length}\t${native}\t${embed}\t${spec}\t${bare.length}`)
  if (bare.length && bare.length <= 12) {
    for (const s of bare) console.log(`  bare: ${s}`)
  } else if (bare.length) {
    console.log(`  bare sample: ${bare.slice(0, 6).join(', ')} (+${bare.length - 6} more)`)
  }
}

if (totalBare > 0) {
  console.error(`\n${totalBare} lesson(s) without any visual catalog entry.`)
  process.exit(1)
}

console.log('\nAll lessons have native diagram, embed, or step spec coverage.')
