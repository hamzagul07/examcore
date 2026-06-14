#!/usr/bin/env node
/**
 * Generate deep STEM pilot lessons with Gemini.
 *
 * Usage:
 *   npx tsx scripts/generate-stem-deep-lesson.mjs --code=9701 --topic=3.5
 *   npx tsx scripts/generate-stem-deep-lesson.mjs --code=9701 --all-pilots
 *   npx tsx scripts/generate-stem-deep-lesson.mjs --all-stem
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const p = path.join(ROOT, '.env.local')
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (process.env[k] === undefined) process.env[k] = v
  }
}

function getArg(name) {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3)
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`)
}

async function loadTopics(subjectCode) {
  if (subjectCode === '9709') {
    const { CAMBRIDGE_9709_SYLLABUS } = await import('../lib/syllabus.ts')
    return { subjectName: 'Mathematics', topics: CAMBRIDGE_9709_SYLLABUS }
  }
  const file = path.join(ROOT, 'lib', 'syllabi', `${subjectCode}.json`)
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  return { subjectName: data.subjectName, topics: data.topics }
}

async function main() {
  loadEnv()

  const useVertex = ['true', '1', 'yes'].includes((process.env.USE_VERTEX_AI ?? '').trim().toLowerCase())
  if (!useVertex && !process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY or USE_VERTEX_AI required')
    process.exit(1)
  }

  const { generateStemDeepLesson } = await import('../lib/courses/generate-stem-deep-lesson.ts')
  const { isDeepLesson } = await import('../lib/courses/stem-deep-quality.ts')
  const { topicToLessonSlug } = await import('../lib/courses/slug.ts')

  const code = getArg('code')
  const topicCode = getArg('topic')
  const stemCodes = hasFlag('all-stem')
    ? ['9701', '9709', '9231', '9700', '9618', '9702']
    : code
      ? [code]
      : []

  if (!stemCodes.length) {
    console.error('Usage: --code=9701 --topic=3.5 | --code=9701 --all-pilots | --all-stem')
    process.exit(1)
  }

  const results = []

  for (const subjectCode of stemCodes) {
    const { subjectName, topics } = await loadTopics(subjectCode)
    let targets = topics

    if (topicCode) {
      targets = topics.filter((t) => t.code === topicCode)
    } else if (hasFlag('all-pilots') || hasFlag('all-stem')) {
      const dir = path.join(ROOT, 'content', 'courses', subjectCode)
      if (!fs.existsSync(dir)) continue
      const pilotSlugs = new Set()
      for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith('.json') || f.endsWith('.pilot.json')) continue
        const raw = fs.readFileSync(path.join(dir, f), 'utf8')
        const isPilot = raw.includes('"status": "pilot"') || raw.includes('"status":"pilot"')
        const isOutline = raw.includes('"status": "outline"') || raw.includes('"status":"outline"')
        if (isPilot || (isOutline && hasFlag('include-outlines'))) {
          pilotSlugs.add(f.replace('.json', ''))
        }
      }
      targets = topics.filter((t) => pilotSlugs.has(topicToLessonSlug(t.code, t.name)))

      if (hasFlag('all-stem')) {
        targets = targets.filter((t) => {
          const fp = path.join(
            ROOT,
            'content',
            'courses',
            subjectCode,
            `${topicToLessonSlug(t.code, t.name)}.json`
          )
          if (!fs.existsSync(fp)) return true
          const lesson = JSON.parse(fs.readFileSync(fp, 'utf8'))
          return !isDeepLesson(lesson)
        })
      }
    }

    for (const topic of targets) {
      const slug = topicToLessonSlug(topic.code, topic.name)
      const outPath = path.join(ROOT, 'content', 'courses', subjectCode, `${slug}.json`)
      console.log(`\nDeep-generating ${subjectCode} ${topic.code} ${topic.name}...`)

      try {
        const { lesson } = await generateStemDeepLesson({
          subjectCode,
          subjectName,
          topic,
        })
        fs.mkdirSync(path.dirname(outPath), { recursive: true })
        fs.writeFileSync(outPath, JSON.stringify(lesson, null, 2) + '\n')
        results.push({ subjectCode, topic: topic.code, slug, ok: true })
        console.log(`  ✓ ${outPath}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        results.push({ subjectCode, topic: topic.code, slug, ok: false, error: msg })
        console.error(`  ✗ ${msg}`)
      }
    }
  }

  const reportDir = path.join(ROOT, 'docs', 'content-generation')
  fs.mkdirSync(reportDir, { recursive: true })
  fs.writeFileSync(
    path.join(reportDir, 'stem-deep-generation-report.json'),
    JSON.stringify(results, null, 2)
  )

  const failed = results.filter((r) => !r.ok)
  console.log(`\nDone: ${results.length - failed.length}/${results.length} OK`)
  if (failed.length) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
