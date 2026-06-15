#!/usr/bin/env node
/**
 * Promote deep STEM pilot lessons to premium (removes pilot preview banner).
 *
 *   npx tsx scripts/promote-stem-pilots.mjs
 *   npx tsx scripts/promote-stem-pilots.mjs --dry-run
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const STEM = ['9701', '9702', '9700', '9709', '9231', '9618']
const dryRun = process.argv.includes('--dry-run')

async function main() {
  const { isDeepLesson } = await import('../lib/courses/stem-deep-quality.ts')
  const { hasLessonLiveDiagram } = await import('../lib/courses/lesson-diagrams.ts')

  let promoted = 0
  let skipped = 0
  const today = new Date().toISOString().slice(0, 10)

  for (const code of STEM) {
    const dir = path.join(ROOT, 'content/courses', code)
    if (!fs.existsSync(dir)) continue

    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.json') || file.endsWith('.pilot.json')) continue
      const filePath = path.join(dir, file)
      const lesson = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      if (lesson.status !== 'pilot') continue

      if (!isDeepLesson(lesson)) {
        console.log(`  skip ${code}/${lesson.slug} (not deep-quality)`)
        skipped++
        continue
      }
      if (!hasLessonLiveDiagram(lesson.slug)) {
        console.log(`  skip ${code}/${lesson.slug} (no native diagram)`)
        skipped++
        continue
      }

      if (dryRun) {
        console.log(`  → ${code}/${lesson.slug}`)
        promoted++
        continue
      }

      lesson.status = 'premium'
      lesson.updated = today
      fs.writeFileSync(filePath, `${JSON.stringify(lesson, null, 2)}\n`)
      console.log(`  ✓ ${code}/${lesson.slug}`)
      promoted++
    }
  }

  console.log(`\nPromoted: ${promoted}${dryRun ? ' (dry run)' : ''}`)
  if (skipped) console.log(`Skipped:  ${skipped}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
