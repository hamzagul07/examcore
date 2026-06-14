#!/usr/bin/env node
/**
 * Batch STEM pilot generation from STEM_PILOT_TUPLES.
 *
 * Usage:
 *   npx tsx scripts/batch-stem-pilots.mjs --phase=reference
 *   npx tsx scripts/batch-stem-pilots.mjs --phase=chem
 *   npx tsx scripts/batch-stem-pilots.mjs --phase=maths
 *   npx tsx scripts/batch-stem-pilots.mjs --phase=cs
 *   npx tsx scripts/batch-stem-pilots.mjs --phase=physics
 *   npx tsx scripts/batch-stem-pilots.mjs --phase=biology
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
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

function getArg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit?.slice(name.length + 3)
}

async function promoteFlat(subjectCode, paperNumber, slug, status = 'pilot') {
  const { pilotLessonPath } = await import('../lib/courses/paths.ts')
  const pilotPath = pilotLessonPath(subjectCode, paperNumber, slug)
  if (!existsSync(pilotPath)) return null
  const lesson = JSON.parse(readFileSync(pilotPath, 'utf8'))
  lesson.status = status
  lesson.updated = new Date().toISOString().slice(0, 10)
  const outPath = join(ROOT, 'content', 'courses', subjectCode, `${slug}.json`)
  writeFileSync(outPath, JSON.stringify(lesson, null, 2) + '\n')
  return outPath
}

async function main() {
  loadEnv()
  const phase = getArg('phase') ?? 'reference'
  const skipLlm = process.argv.includes('--skip-answerability')

  const { STEM_PILOT_PHASES } = await import('../lib/courses/generator/stem-pilot-tuples.ts')
  const { generateLesson } = await import('../lib/courses/generator/generate-lesson.ts')

  const batch = STEM_PILOT_PHASES[phase]
  if (!batch) {
    console.error(`Unknown phase: ${phase}. Available: ${Object.keys(STEM_PILOT_PHASES).join(', ')}`)
    process.exit(1)
  }

  const supabase =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
      : undefined

  const results = []

  for (const t of batch) {
    console.log(`\n[${phase}] ${t.subjectCode} P${t.paperNumber}/${t.topicCode} — ${t.label}`)
    try {
      const result = await generateLesson({
        subjectCode: t.subjectCode,
        paperNumber: t.paperNumber,
        topicCode: t.topicCode,
        supabase,
        skipAnswerabilityLlm: skipLlm,
      })
      let flatPath = null
      if (result.validation.ok) {
        flatPath = await promoteFlat(t.subjectCode, t.paperNumber, result.lesson.slug, t.promoteStatus ?? 'pilot')
      }
      results.push({ ...t, ok: result.validation.ok, slug: result.lesson.slug, flatPath, issues: result.validation.issues })
      console.log(`  ${result.validation.ok ? '✓' : '⚠'} ${result.outputPath}`)
      if (flatPath) console.log(`  → ${flatPath}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ ...t, ok: false, error: msg })
      console.error(`  ✗ ${msg}`)
    }
  }

  const reportDir = join(ROOT, 'docs', 'content-generation')
  mkdirSync(reportDir, { recursive: true })
  const reportPath = join(reportDir, `stem-${phase}-report.md`)
  writeFileSync(
    reportPath,
    [
      `# STEM batch: ${phase}`,
      '',
      `Generated: ${new Date().toISOString()}`,
      '',
      '| Subject | Tuple | Slug | Status | Output |',
      '|---------|-------|------|--------|--------|',
      ...results.map((r) =>
        r.ok === false
          ? `| ${r.subjectCode} | P${r.paperNumber}/${r.topicCode} | — | FAILED | ${(r.error ?? '').slice(0, 60)} |`
          : `| ${r.subjectCode} | P${r.paperNumber}/${r.topicCode} | ${r.slug} | ${r.ok ? 'PASS' : 'WARN'} | \`${r.flatPath ?? 'pilot only'}\` |`
      ),
    ].join('\n')
  )
  console.log(`\nReport: ${reportPath}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
