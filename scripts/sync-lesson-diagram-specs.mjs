#!/usr/bin/env node
/**
 * Persist diagramSpec from catalog into lesson JSON (native + embed topics).
 *
 *   npx tsx scripts/sync-lesson-diagram-specs.mjs
 *   npx tsx scripts/sync-lesson-diagram-specs.mjs --dry-run
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const dryRun = process.argv.includes('--dry-run')
const subjectArg = process.argv.find((a) => a.startsWith('--subject='))?.split('=')[1]

async function main() {
  const { hasLessonLiveDiagram } = await import('../lib/courses/lesson-diagrams.ts')
  const { attachCatalogVisuals } = await import('../lib/courses/attach-lesson-visuals.ts')

  let scanned = 0
  let updated = 0
  const coursesDir = path.join(ROOT, 'content/courses')

  for (const code of fs.readdirSync(coursesDir)) {
    if (subjectArg && code !== subjectArg) continue
    const dir = path.join(coursesDir, code)
    if (!fs.statSync(dir).isDirectory()) continue

    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.json') || file.includes('.pilot.')) continue
      const filePath = path.join(dir, file)
      const lesson = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      scanned++

      const slug = lesson.slug ?? file.replace('.json', '')
      const hydrated = attachCatalogVisuals({ ...lesson, slug })
      if (!hydrated.diagramSpec) continue

      const before = JSON.stringify(lesson.diagramSpec ?? null)
      const after = JSON.stringify(hydrated.diagramSpec)
      if (before === after) continue

      updated++
      if (dryRun) {
        console.log(`  → ${code}/${slug}`)
        continue
      }

      lesson.diagramSpec = hydrated.diagramSpec
      lesson.updated = new Date().toISOString().slice(0, 10)
      fs.writeFileSync(filePath, `${JSON.stringify(lesson, null, 2)}\n`)
      console.log(`  ✓ ${code}/${slug}`)
    }
  }

  console.log(`\nScanned: ${scanned}`)
  console.log(`Updated: ${updated}${dryRun ? ' (dry run)' : ''}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
