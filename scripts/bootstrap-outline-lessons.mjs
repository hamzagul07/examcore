#!/usr/bin/env node
/**
 * Bootstrap outline course lessons from lib/syllabi/{code}.json
 *
 *   npx tsx scripts/bootstrap-outline-lessons.mjs --code=2281
 *   npx tsx scripts/bootstrap-outline-lessons.mjs --code=2281 --code=7115
 *   npx tsx scripts/bootstrap-outline-lessons.mjs --olevel-traffic
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OLEVEL_TRAFFIC = ['2281', '7115']

function getCodes() {
  const codes = []
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i]
    if (a === '--olevel-traffic') {
      codes.push(...OLEVEL_TRAFFIC)
      continue
    }
    if (a.startsWith('--code=')) codes.push(a.slice(7))
    else if (a === '--code' && process.argv[i + 1]) {
      codes.push(process.argv[++i])
    }
  }
  return [...new Set(codes)]
}

async function main() {
  const codes = getCodes()
  const force = process.argv.includes('--force')
  if (!codes.length) {
    console.error('Usage: --code=2281 [--code=7115] | --olevel-traffic')
    process.exit(1)
  }

  const { buildOutlineLesson } = await import('../lib/courses/outline.ts')
  const { topicToLessonSlug } = await import('../lib/courses/slug.ts')
  const { hydrateLessonCatalogVisuals } = await import('../lib/courses/attach-lesson-visuals.ts')
  const { clearCourseCatalogCache } = await import('../lib/courses/catalog-cache.ts')

  let written = 0
  let skipped = 0

  for (const code of codes) {
    const syllabusPath = path.join(ROOT, 'lib', 'syllabi', `${code}.json`)
    if (!fs.existsSync(syllabusPath)) {
      console.warn(`Skip ${code}: no lib/syllabi/${code}.json`)
      continue
    }
    const data = JSON.parse(fs.readFileSync(syllabusPath, 'utf8'))
    const outDir = path.join(ROOT, 'content', 'courses', code)
    fs.mkdirSync(outDir, { recursive: true })

    for (const topic of data.topics) {
      const slug = topicToLessonSlug(topic.code, topic.name)
      const fp = path.join(outDir, `${slug}.json`)
      if (fs.existsSync(fp) && !force) {
        skipped++
        continue
      }
      let lesson = buildOutlineLesson(code, data.subjectName, topic)
      lesson = hydrateLessonCatalogVisuals(lesson)
      fs.writeFileSync(fp, JSON.stringify(lesson, null, 2) + '\n')
      written++
    }
    console.log(`${code}: ${data.topics.length} syllabus points`)
  }

  clearCourseCatalogCache()
  console.log(`\nWrote ${written} outline lesson(s), skipped ${skipped} existing`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
