#!/usr/bin/env node
/** Add catalog visuals to existing rich 9700 lessons without replacing content. */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const POLISH_TOPICS = [
  '6.1',
  '6.2',
  '9.1',
  '10.1',
  '11.1',
  '12.1',
  '13.1',
  '14.1',
  '15.1',
  '16.1',
]

async function main() {
  const { getSyllabusByCode } = await import('../lib/syllabi/index.ts')
  const { topicToLessonSlug } = await import('../lib/courses/slug.ts')
  const { hydrateLessonCatalogVisuals } = await import('../lib/courses/attach-lesson-visuals.ts')

  const topics = getSyllabusByCode('9700') ?? []
  let updated = 0

  for (const code of POLISH_TOPICS) {
    const topic = topics.find((t) => t.code === code)
    if (!topic) continue
    const slug = topicToLessonSlug(topic.code, topic.name)
    const fp = path.join(ROOT, 'content', 'courses', '9700', `${slug}.json`)
    if (!fs.existsSync(fp)) {
      console.warn(`Missing: ${fp}`)
      continue
    }
    const lesson = JSON.parse(fs.readFileSync(fp, 'utf8'))
    const hydrated = hydrateLessonCatalogVisuals(lesson)
    hydrated.updated = new Date().toISOString().slice(0, 10)
    fs.writeFileSync(fp, JSON.stringify(hydrated, null, 2) + '\n')
    console.log(`Polished visuals: ${slug}`)
    updated++
  }

  console.log(`\nUpdated ${updated} biology lesson(s)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
