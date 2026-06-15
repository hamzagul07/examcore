#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const STEM = ['9701', '9709', '9231', '9700', '9618', '9702']

async function main() {
  const { hydrateLessonCatalogVisuals } = await import('../lib/courses/attach-lesson-visuals.ts')
  const { lessonHasCatalogVisual } = await import('../lib/courses/sync-steps-to-catalog.ts')
  const { hasLessonLiveDiagram } = await import('../lib/courses/lesson-diagrams.ts')

  const missing = []

  for (const code of STEM) {
    const dir = path.join(ROOT, 'content', 'courses', code)
    if (!fs.existsSync(dir)) continue
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.json') || f.endsWith('.pilot.json')) continue
      const lesson = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
      if (lesson.status !== 'pilot') continue
      const h = hydrateLessonCatalogVisuals(lesson)
      const hasVisual =
        !!(h.interactiveEmbed || h.diagramSpec || h.diagram) || hasLessonLiveDiagram(lesson.slug)
      if (hasVisual) continue
      missing.push({
        code,
        topic: lesson.topicCode,
        slug: lesson.slug,
        title: lesson.title,
        hasCatalog: lessonHasCatalogVisual(lesson.slug),
      })
    }
  }

  const byCode = Object.fromEntries(
    STEM.map((c) => [c, missing.filter((m) => m.code === c).length])
  )

  console.log(`Pilots without visual: ${missing.length}`)
  console.log(byCode)
  for (const m of missing.slice(0, 40)) {
    console.log(`  ${m.code} ${m.topic} ${m.slug}`)
  }

  const reportDir = path.join(ROOT, 'docs', 'content-generation')
  fs.mkdirSync(reportDir, { recursive: true })
  fs.writeFileSync(
    path.join(reportDir, 'pilots-without-visuals.json'),
    JSON.stringify({ count: missing.length, byCode, missing }, null, 2)
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
