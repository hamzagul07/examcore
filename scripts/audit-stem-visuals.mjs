#!/usr/bin/env node
/** Audit STEM premium lessons: visuals, step sync, generic content. */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const STEM = ['9701', '9709', '9231', '9700', '9618', '9702']

function isPremiumLesson(raw) {
  return raw.includes('"status": "premium"') || raw.includes('"status":"premium"')
}

async function main() {
  const { hydrateLessonCatalogVisuals } = await import('../lib/courses/attach-lesson-visuals.ts')
  const { lessonHasCatalogVisual } = await import('../lib/courses/sync-steps-to-catalog.ts')
  const { isDeepLesson, countGenericFlashcards, isGenericStep } = await import(
    '../lib/courses/stem-deep-quality.ts'
  )
  const { hasLessonLiveDiagram } = await import('../lib/courses/lesson-diagrams.ts')

  let premium = 0
  let withVisual = 0
  let stepMismatch = 0
  let genericSteps = 0
  let shallow = 0
  const shallowList = []

  for (const code of STEM) {
    const dir = path.join(ROOT, 'content', 'courses', code)
    if (!fs.existsSync(dir)) continue

    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.json') || f.endsWith('.pilot.json')) continue
      const raw = fs.readFileSync(path.join(dir, f), 'utf8')
      if (!isPremiumLesson(raw)) continue

      premium++
      const lesson = JSON.parse(raw)
      const hydrated = hydrateLessonCatalogVisuals(lesson)
      const hasCatalog = lessonHasCatalogVisual(lesson.slug)
      const hasVisual =
        !!(hydrated.interactiveEmbed || hydrated.diagramSpec || hydrated.diagram) ||
        hasLessonLiveDiagram(lesson.slug)
      if (hasVisual) withVisual++

      const steps = hydrated.simpleExplanation?.steps ?? []
      if (steps.some(isGenericStep)) genericSteps++
      if (hydrated.diagramSpec?.steps?.length && steps.length !== hydrated.diagramSpec.steps.length) {
        stepMismatch++
      }

      if (!isDeepLesson(hydrated)) {
        shallow++
        shallowList.push({
          code,
          topic: lesson.topicCode,
          slug: lesson.slug,
          genericFc: countGenericFlashcards(hydrated),
          hasCatalog,
          hasVisual,
        })
      }
    }
  }

  console.log('\nSTEM Visual + Depth Audit (premium lessons)')
  console.log('='.repeat(60))
  console.log(`Premium lessons:      ${premium}`)
  console.log(`With live visual:     ${withVisual}`)
  console.log(`Step count mismatch:  ${stepMismatch}`)
  console.log(`Generic carousel:     ${genericSteps}`)
  console.log(`Not deep-quality:     ${shallow}`)
  console.log('='.repeat(60))

  if (shallowList.length) {
    console.log('\nShallow premium lessons (first 25):')
    for (const s of shallowList.slice(0, 25)) {
      console.log(
        `  ${s.code}/${s.topic} ${s.slug} | genericFc=${s.genericFc} catalog=${s.hasCatalog} visual=${s.hasVisual}`
      )
    }
    if (shallowList.length > 25) console.log(`  ... and ${shallowList.length - 25} more`)
  }

  const reportDir = path.join(ROOT, 'docs', 'content-generation')
  fs.mkdirSync(reportDir, { recursive: true })
  fs.writeFileSync(
    path.join(reportDir, 'stem-visual-audit.json'),
    JSON.stringify({ premium, withVisual, stepMismatch, genericSteps, shallow, shallowList }, null, 2)
  )
  console.log(`\nReport: docs/content-generation/stem-visual-audit.json`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
