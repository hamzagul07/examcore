#!/usr/bin/env node
/** Upgrade 9702 flat stub lessons using existing paper pilots or builder. */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const STUBS = [
  { topic: '7.2', paper: '2' },
  { topic: '8.2', paper: '2' },
]

async function main() {
  const { getSyllabusByCode } = await import('../lib/syllabi/index.ts')
  const { topicToLessonSlug } = await import('../lib/courses/slug.ts')
  const { pilotLessonPath } = await import('../lib/courses/paths.ts')
  const { buildStemPilotLesson } = await import('../lib/courses/stem-pilot-builder.ts')
  const { hydrateLessonCatalogVisuals } = await import('../lib/courses/attach-lesson-visuals.ts')

  const topics = getSyllabusByCode('9702') ?? []

  for (const { topic, paper } of STUBS) {
    const leaf = topics.find((t) => t.code === topic)
    if (!leaf) continue
    const slug = topicToLessonSlug(topic, leaf.name)
    const pilotPath = pilotLessonPath('9702', paper, slug)
    const flatPath = path.join(ROOT, 'content', 'courses', '9702', `${slug}.json`)

    let lesson
    if (fs.existsSync(pilotPath)) {
      lesson = JSON.parse(fs.readFileSync(pilotPath, 'utf8'))
      lesson.status = 'pilot'
    } else {
      lesson = buildStemPilotLesson({
        subjectCode: '9702',
        subjectName: 'Physics',
        topic: leaf,
        status: 'pilot',
      })
    }

    const hydrated = hydrateLessonCatalogVisuals(lesson)
    hydrated.updated = new Date().toISOString().slice(0, 10)
    fs.writeFileSync(flatPath, JSON.stringify(hydrated, null, 2) + '\n')
    console.log(`Upgraded 9702/${slug}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
