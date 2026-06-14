#!/usr/bin/env node
/**
 * Build STEM pilot lessons from syllabus + overrides.
 *
 * Usage:
 *   npx tsx scripts/build-stem-pilot-lessons.mjs --code=9701 --outline-only
 *   npx tsx scripts/build-stem-pilot-lessons.mjs --all-stem
 *   npx tsx scripts/build-stem-pilot-lessons.mjs --code=9701 --deep
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const STEM_CODES = ['9701', '9709', '9231', '9700', '9618', '9702']

function getArg(name) {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3)
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`)
}

async function loadTopics(code) {
  if (code === '9709') {
    const { CAMBRIDGE_9709_SYLLABUS } = await import('../lib/syllabus.ts')
    return { subjectName: 'Mathematics', topics: CAMBRIDGE_9709_SYLLABUS }
  }
  const file = path.join(ROOT, 'lib', 'syllabi', `${code}.json`)
  if (!fs.existsSync(file)) return null
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  return { subjectName: data.subjectName, topics: data.topics }
}

async function main() {
  const { buildStemPilotLesson, assertPilotDepth } = await import('../lib/courses/stem-pilot-builder.ts')
  const { buildOutlineLesson } = await import('../lib/courses/outline.ts')
  const { hydrateLessonCatalogVisuals } = await import('../lib/courses/attach-lesson-visuals.ts')
  const { syncLessonStepsToCatalog } = await import('../lib/courses/sync-steps-to-catalog.ts')
  const deepMode = hasFlag('deep')

  let generateStemDeepLesson
  if (deepMode) {
    const mod = await import('../lib/courses/generate-stem-deep-lesson.ts')
    generateStemDeepLesson = mod.generateStemDeepLesson
  }

  const code = getArg('code')
  const codes = hasFlag('all-stem') ? STEM_CODES : code ? [code] : STEM_CODES
  const outlineOnly = hasFlag('outline-only')
  const outlines9231 = hasFlag('outlines')

  let written = 0
  let skipped = 0
  const issues = []

  for (const subjectCode of codes) {
    const loaded = await loadTopics(subjectCode)
    if (!loaded) {
      console.warn(`Skip ${subjectCode}: no syllabus`)
      continue
    }

    const { subjectName, topics } = loaded
    const outDir = path.join(ROOT, 'content', 'courses', subjectCode)
    fs.mkdirSync(outDir, { recursive: true })

    for (const topic of topics) {
      const { topicToLessonSlug } = await import('../lib/courses/slug.ts')
      const slug = topicToLessonSlug(topic.code, topic.name)
      const fp = path.join(outDir, `${slug}.json`)

      // 9231 outlines mode
      if (outlines9231 && subjectCode === '9231') {
        const outline = buildOutlineLesson(subjectCode, subjectName, topic)
        fs.writeFileSync(fp, JSON.stringify(outline, null, 2) + '\n')
        written++
        continue
      }

      const topicsFilter = getArg('topics')?.split(',').map((t) => t.trim())
      if (topicsFilter && !topicsFilter.includes(topic.code)) {
        skipped++
        continue
      }

      if (outlineOnly) {
        if (!fs.existsSync(fp)) {
          skipped++
          continue
        }
        const raw = fs.readFileSync(fp, 'utf8')
        if (!raw.includes('"status": "outline"') && !raw.includes('"status":"outline"')) {
          skipped++
          continue
        }
      }

      // Skip rich 9700/9702 unless explicitly filtered or deep mode
      if (
        !topicsFilter &&
        !outlineOnly &&
        !deepMode &&
        (subjectCode === '9700' || subjectCode === '9702')
      ) {
        skipped++
        continue
      }

      if (deepMode && fs.existsSync(fp)) {
        const existing = JSON.parse(fs.readFileSync(fp, 'utf8'))
        if (existing.status === 'pilot') {
          const { isDeepLesson } = await import('../lib/courses/stem-deep-quality.ts')
          if (isDeepLesson(existing)) {
            skipped++
            continue
          }
        }
      }

      let lesson
      if (deepMode) {
        try {
          const { lesson: deepLesson } = await generateStemDeepLesson({
            subjectCode,
            subjectName,
            topic,
          })
          lesson = deepLesson
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          issues.push({ subjectCode, topic: topic.code, depthIssues: [msg] })
          lesson = buildStemPilotLesson({ subjectCode, subjectName, topic, status: 'pilot', deep: true })
        }
      } else {
        lesson = buildStemPilotLesson({ subjectCode, subjectName, topic, status: 'pilot' })
      }

      const depthIssues = assertPilotDepth(lesson)
      if (depthIssues.length) issues.push({ subjectCode, topic: topic.code, depthIssues })

      let hydrated = syncLessonStepsToCatalog(lesson)
      hydrated = hydrateLessonCatalogVisuals(hydrated)
      fs.writeFileSync(fp, JSON.stringify(hydrated, null, 2) + '\n')
      written++
    }
  }

  console.log(`\nWrote ${written} lesson(s), skipped ${skipped}`)
  if (issues.length) {
    console.warn(`\n${issues.length} lesson(s) with depth warnings:`)
    for (const i of issues.slice(0, 10)) {
      console.warn(`  ${i.subjectCode}/${i.topic}: ${i.depthIssues.join('; ')}`)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
