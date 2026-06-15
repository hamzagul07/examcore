#!/usr/bin/env node
/**
 * Replace stale PhET/GeoGebra copy when native diagrams are primary.
 *
 *   npx tsx scripts/fix-native-primary-copy.mjs
 *   npx tsx scripts/fix-native-primary-copy.mjs --dry-run
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const dryRun = process.argv.includes('--dry-run')

const PHET_RE =
  /\*\*PhET[^*]*\*\*|PhET [A-Za-z0-9 -]+ simulation|PhET simulation|the PhET sim|PhET sim\b|Build an Atom PhET|Use the PhET|live PhET|PhET Build an Atom/gi
const GEO_RE =
  /\*\*GeoGebra[^*]*\*\*|GeoGebra (?:activity|explorer|material)|the GeoGebra|live GeoGebra/gi

function cleanNativeCopy(text) {
  if (!text || typeof text !== 'string') return text
  let next = text
  next = next.replace(PHET_RE, 'step-synced live diagram')
  next = next.replace(GEO_RE, 'step-synced live diagram')
  next = next.replace(/\blive step-synced live diagram\b/gi, 'step-synced live diagram')
  next = next.replace(/\bstep-synced live diagram below\b/gi, 'live diagram below')
  next = next.replace(/\s{2,}/g, ' ')
  next = next.replace(/ \./g, '.')
  return next.trim()
}

function patchLesson(lesson) {
  let changed = false
  const touch = (obj, key) => {
    if (!obj?.[key]) return
    const cleaned = cleanNativeCopy(obj[key])
    if (cleaned !== obj[key]) {
      obj[key] = cleaned
      changed = true
    }
  }

  touch(lesson, 'summary')
  const intro = lesson.sections?.find((s) => s.type === 'intro')
  if (intro?.type === 'intro') touch(intro, 'content')
  if (lesson.simpleExplanation) {
    touch(lesson.simpleExplanation, 'summary')
    if (Array.isArray(lesson.simpleExplanation.steps)) {
      lesson.simpleExplanation.steps = lesson.simpleExplanation.steps.map((step) => {
        const cleaned = cleanNativeCopy(step)
        if (cleaned !== step) changed = true
        return cleaned
      })
    }
  }
  return changed
}

async function main() {
  const { hasLessonLiveDiagram } = await import('../lib/courses/lesson-diagrams.ts')
  const { resolveLessonInteractiveEmbed } = await import('../lib/courses/interactive-embeds.ts')
  const { isDualVisualSlug } = await import('../lib/courses/placeholder-embeds.ts')

  let scanned = 0
  let updated = 0
  const coursesDir = path.join(ROOT, 'content/courses')

  for (const code of fs.readdirSync(coursesDir)) {
    const dir = path.join(coursesDir, code)
    if (!fs.statSync(dir).isDirectory()) continue

    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.json') || file.includes('.pilot.')) continue
      const filePath = path.join(dir, file)
      const lesson = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      scanned++

      if (!hasLessonLiveDiagram(lesson.slug)) continue
      if (isDualVisualSlug(lesson.slug)) continue
      if (resolveLessonInteractiveEmbed(lesson)) continue

      if (!patchLesson(lesson)) continue
      updated++
      if (dryRun) {
        console.log(`  → ${code}/${lesson.slug}`)
        continue
      }
      fs.writeFileSync(filePath, `${JSON.stringify(lesson, null, 2)}\n`)
      console.log(`  ✓ ${code}/${lesson.slug}`)
    }
  }

  console.log(`\nScanned:  ${scanned}`)
  console.log(`Updated:  ${updated}${dryRun ? ' (dry run)' : ''}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
