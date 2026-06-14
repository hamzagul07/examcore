#!/usr/bin/env node
/**
 * Sync pilot simpleExplanation steps to catalog diagram-spec embed hints.
 * Usage: npx tsx scripts/sync-pilot-steps-to-catalog.mjs [--code=9701]
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const STEM = ['9701', '9709', '9231', '9700', '9618', '9702']

function getArg(name) {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3)
}

async function main() {
  const codeFilter = getArg('code')
  const codes = codeFilter ? [codeFilter] : STEM

  const { syncLessonStepsToCatalog } = await import('../lib/courses/sync-steps-to-catalog.ts')
  const { hydrateLessonCatalogVisuals } = await import('../lib/courses/attach-lesson-visuals.ts')

  let updated = 0
  let skipped = 0

  for (const code of codes) {
    const dir = path.join(ROOT, 'content', 'courses', code)
    if (!fs.existsSync(dir)) continue

    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.json') || f.endsWith('.pilot.json')) continue
      const fp = path.join(dir, f)
      const lesson = JSON.parse(fs.readFileSync(fp, 'utf8'))
      if (lesson.status !== 'pilot') {
        skipped++
        continue
      }

      const synced = syncLessonStepsToCatalog(lesson)
      const hydrated = hydrateLessonCatalogVisuals(synced)
      hydrated.updated = new Date().toISOString().slice(0, 10)
      fs.writeFileSync(fp, JSON.stringify(hydrated, null, 2) + '\n')
      updated++
    }
  }

  console.log(`Synced steps for ${updated} pilot(s), skipped ${skipped}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
