#!/usr/bin/env node
/**
 * Remove baked-in interactiveEmbed from lesson JSON when native diagrams are primary.
 *
 *   npx tsx scripts/strip-stale-lesson-embeds.mjs
 *   npx tsx scripts/strip-stale-lesson-embeds.mjs --dry-run
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const dryRun = process.argv.includes('--dry-run')

async function main() {
  const { preferNativeDiagramOverPlaceholder } = await import(
    '../lib/courses/placeholder-embeds.ts'
  )

  let scanned = 0
  let stripped = 0
  const coursesDir = path.join(ROOT, 'content/courses')

  for (const code of fs.readdirSync(coursesDir)) {
    const dir = path.join(coursesDir, code)
    if (!fs.statSync(dir).isDirectory()) continue

    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.json') || file.includes('.pilot.')) continue
      const filePath = path.join(dir, file)
      const lesson = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      scanned++

      const embed = lesson.interactiveEmbed
      if (!embed?.embedUrl) continue

      const kept = preferNativeDiagramOverPlaceholder(lesson.slug ?? file.replace('.json', ''), embed)
      if (kept) continue

      stripped++
      if (dryRun) {
        console.log(`  → ${code}/${file}`)
        continue
      }

      delete lesson.interactiveEmbed
      fs.writeFileSync(filePath, `${JSON.stringify(lesson, null, 2)}\n`)
      console.log(`  ✓ ${code}/${file.replace('.json', '')}`)
    }
  }

  console.log(`\nScanned: ${scanned}`)
  console.log(`Stripped: ${stripped}${dryRun ? ' (dry run)' : ''}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
