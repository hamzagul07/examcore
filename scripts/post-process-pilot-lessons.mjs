#!/usr/bin/env node
/**
 * Re-apply deterministic post-processing to existing .pilot.json files
 * (diagrams, past paper practice, img strip, orphan headings, pill labels, quick check).
 *
 * Usage: npx tsx scripts/post-process-pilot-lessons.mjs
 */
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const p = join(ROOT, '.env.local')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split('\n')) {
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

async function main() {
  loadEnv()

  const { PILOT_TUPLES, GENERATOR_VERSION } = await import('../lib/courses/generator/constants.ts')
  const { getLessonEvidence } = await import('../lib/courses/content-source.ts')
  const { fetchDiagramsByQuestionIds } = await import('../lib/courses/content-source-diagrams.ts')
  const { postProcessGeneratedLesson } = await import('../lib/courses/generator/lesson-post-process.ts')
  const { GeneratedLessonSchema } = await import('../lib/courses/generator/lesson-schema.ts')
  const { pilotLessonPath } = await import('../lib/courses/paths.ts')

  const subjectCode = '9702'

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase env required')
    process.exit(1)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const results = []

  for (const t of PILOT_TUPLES) {
    const evidence = await getLessonEvidence(subjectCode, t.paperNumber, t.topicCode, {
      supabase,
    })
    const { topicToLessonSlug } = await import('../lib/courses/slug.ts')
    const topicTitle = evidence.objectives[0]?.topic_title ?? t.topicCode
    const slug = topicToLessonSlug(t.topicCode, topicTitle)
    const filePath = pilotLessonPath(subjectCode, t.paperNumber, slug)

    if (!existsSync(filePath)) {
      console.error(`Missing ${filePath}`)
      results.push({ tuple: `${t.paperNumber}/${t.topicCode}`, ok: false, error: 'file not found' })
      continue
    }

    const raw = JSON.parse(readFileSync(filePath, 'utf8'))
    const lesson = GeneratedLessonSchema.parse(raw)

    const workedIds = lesson.sections
      .filter((s) => s.type === 'workedExample' && s.sourceQuestionId)
      .map((s) => s.sourceQuestionId)
    const diagramsByQuestion = await fetchDiagramsByQuestionIds(supabase, workedIds)

    const processed = postProcessGeneratedLesson(lesson, evidence, subjectCode, diagramsByQuestion)
    const out = {
      ...processed,
      generatorVersion: GENERATOR_VERSION,
      generatedAt: new Date().toISOString(),
    }

    writeFileSync(filePath, JSON.stringify(out, null, 2))

    const pp = out.sections.find((s) => s.type === 'pastPaperPractice')
    const diagramCount = out.sections
      .filter((s) => s.type === 'workedExample')
      .reduce((n, s) => n + (s.diagrams?.length ?? 0), 0)

    results.push({
      tuple: `${t.paperNumber}/${t.topicCode}`,
      slug,
      ok: true,
      path: filePath,
      pastPaperQuestions: pp?.type === 'pastPaperPractice' ? pp.questions.length : 0,
      diagrams: diagramCount,
    })
    console.log(
      `✓ ${t.label}: ${pp?.questions?.length ?? 0} past-paper cards, ${diagramCount} diagrams → ${filePath}`
    )
  }

  console.log('\nPost-process complete:', results.length, 'files')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
