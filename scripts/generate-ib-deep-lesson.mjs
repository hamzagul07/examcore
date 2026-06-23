#!/usr/bin/env node
/**
 * Generate deep IB Diploma course lessons from a factual syllabus topic list.
 * No Supabase / past-paper evidence — reuses generateStemDeepLesson() which
 * authors ORIGINAL content from the topic structure. Uses Vertex (USE_VERTEX_AI
 * in .env.local) for the body.
 *
 * Usage:
 *   node --import tsx scripts/generate-ib-deep-lesson.mjs --subject=ib-biology-hl --limit=3
 *   node --import tsx scripts/generate-ib-deep-lesson.mjs --subject=ib-biology-hl --only=C1.3
 *   node --import tsx scripts/generate-ib-deep-lesson.mjs --subject=ib-biology-hl   # all topics
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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (process.env[k] === undefined) process.env[k] = v
  }
}

const getArg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3)

async function main() {
  loadEnv()
  const subject = getArg('subject')
  if (!subject) {
    console.error('Usage: --subject=ib-biology-hl [--limit=N] [--only=CODE] [--force]')
    process.exit(1)
  }
  const limit = getArg('limit') ? Number(getArg('limit')) : undefined
  const only = getArg('only')
  const force = process.argv.includes('--force')

  const syllabus = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib', 'syllabi', `${subject}.json`), 'utf8'))
  const subjectName = syllabus.subjectName
  const boardLabel =
    syllabus.level === 'Core'
      ? 'IB Diploma Core'
      : `IB Diploma ${syllabus.level ?? 'Higher Level'}`
  const markingConvention = 'IB markbands and assessment criteria'

  const isHumanities =
    /^(ib-)?(tok|extended-essay|cas|visual-arts|theatre|music|film|dance)(-|$)/.test(
      subject
    )

  const { topicToLessonSlug } = await import('../lib/courses/slug.ts')
  const generate = isHumanities
    ? (await import('../lib/courses/generate-ib-humanities-deep-lesson.ts'))
        .generateIbHumanitiesDeepLesson
    : (await import('../lib/courses/generate-stem-deep-lesson.ts'))
        .generateStemDeepLesson

  let targets = only ? syllabus.topics.filter((t) => t.code === only) : syllabus.topics
  const outDir = path.join(ROOT, 'content', 'courses', subject)
  fs.mkdirSync(outDir, { recursive: true })

  const results = []
  let done = 0
  for (const topic of targets) {
    if (limit !== undefined && done >= limit) break
    const slug = topicToLessonSlug(topic.code, topic.name).toLowerCase()
    const outPath = path.join(outDir, `${slug}.json`)
    if (fs.existsSync(outPath) && !force) {
      console.log(`-- skip exists: ${slug}`)
      continue
    }
    done++
    console.log(`\nDeep-generating IB ${subject} ${topic.code} ${topic.name}...`)
    try {
      const { lesson } = await generate(
        { subjectCode: subject, subjectName, topic, boardLabel, markingConvention },
        { status: 'premium' }
      )
      lesson.slug = slug // clean lowercase slug for routing
      fs.writeFileSync(outPath, JSON.stringify(lesson, null, 2) + '\n')
      results.push({ topic: topic.code, slug, ok: true })
      console.log(`  ✓ ${outPath}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ topic: topic.code, slug, ok: false, error: msg })
      console.error(`  ✗ ${msg}`)
    }
  }

  const failed = results.filter((r) => !r.ok)
  console.log(`\nDone: ${results.length - failed.length}/${results.length} OK`)
  if (failed.length) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
