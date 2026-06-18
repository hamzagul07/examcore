#!/usr/bin/env node
/**
 * Prompt C Phase 4 — fine-grain syllabus objective extraction.
 *
 * Usage:
 *   pnpm extract:syllabus 9702
 *   pnpm extract:syllabus 9702 --persist
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

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

function parseArgs(argv) {
  const positional = argv.filter((a) => !a.startsWith('--'))
  return {
    subjectCode: positional[0],
    persist: argv.includes('--persist'),
  }
}

async function main() {
  loadEnv()
  const { subjectCode, persist } = parseArgs(process.argv.slice(2))

  if (!subjectCode) {
    console.error('Usage: pnpm extract:syllabus <subject-code> [--persist]')
    process.exit(1)
  }

  const useVertex = ['true', '1', 'yes'].includes(
    (process.env.USE_VERTEX_AI ?? '').trim().toLowerCase()
  )
  if (useVertex) {
    if (!process.env.GOOGLE_CLOUD_PROJECT?.trim()) {
      console.error('GOOGLE_CLOUD_PROJECT required when USE_VERTEX_AI=true')
      process.exit(1)
    }
  } else if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY required in .env.local (or set USE_VERTEX_AI=true)')
    process.exit(1)
  }

  // Give Gemini more headroom — PDF extraction can exceed the 120s default,
  // which surfaced as client-abort "timeout" failures.
  const { setGeminiCallTimeoutMs } = await import('../lib/ai/gemini-text.ts')
  setGeminiCallTimeoutMs(Number(process.env.GEMINI_CALL_TIMEOUT_MS) || 300_000)

  const { extractSyllabus, persistSyllabusObjectives } = await import(
    '../lib/extraction/syllabus-extractor.ts'
  )

  console.log(`Extracting syllabus objectives for ${subjectCode}...`)
  const result = await extractSyllabus({ subjectCode, rootDir: ROOT })

  const outDir = join(ROOT, 'scripts', 'extraction-output')
  mkdirSync(outDir, { recursive: true })
  const outPath = join(outDir, `syllabus_${subjectCode}.json`)

  const payload = {
    generatedAt: new Date().toISOString(),
    summary: {
      subjectCode: result.subjectCode,
      subjectName: result.subjectName,
      syllabusYear: result.syllabusYear,
      objectiveCount: result.objectives.length,
      topicsWithObjectives: result.validation.topicsWithObjectives,
      pageCount: result.pageCount,
      chunksProcessed: result.chunksProcessed,
      singleShot: result.singleShot,
      validationPass: result.validation.pass,
      spotCheck143Count: result.validation.spotCheck143.length,
      jobStatus: result.jobStatus,
      errorMessage: result.errorMessage,
    },
    validation: result.validation,
    objectives: result.objectives,
  }

  writeFileSync(outPath, JSON.stringify(payload, null, 2))
  console.log(`Wrote ${outPath}`)
  console.log(
    `Objectives: ${result.objectives.length}, topics: ${result.validation.topicsWithObjectives}, year: ${result.syllabusYear}`
  )
  console.log(
    `Spot check 14.3: ${result.validation.spotCheck143.length} objectives — ${result.validation.spotCheck143.map((o) => o.objective_number).join(', ')}`
  )

  if (persist) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const inserted = await persistSyllabusObjectives(supabase, result)
    console.log(`Persisted ${inserted} rows to syllabus_objectives`)
  }

  if (result.errorMessage) {
    console.log('\nValidation notes:\n' + result.errorMessage)
  }

  if (result.jobStatus === 'failed') {
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
