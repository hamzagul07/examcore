#!/usr/bin/env node
/**
 * Import extracted question JSON exports into extracted_questions (upsert by identity).
 *
 * Usage:
 *   pnpm persist:extraction --session=s24
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, readdirSync } from 'fs'
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
  let session = null
  for (const arg of argv) {
    if (arg.startsWith('--session=')) session = arg.slice('--session='.length).toLowerCase()
  }
  return { session }
}

async function main() {
  loadEnv()
  const { session } = parseArgs(process.argv.slice(2))
  if (!session) {
    console.error('Usage: pnpm persist:extraction --session=s24')
    process.exit(1)
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase env vars required')
    process.exit(1)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { persistExtractedQuestions } = await import('../lib/extraction/question-tree.ts')
  const { parseQuestionPaperPath } = await import('../lib/extraction/paper-meta.ts')

  const outDir = join(ROOT, 'scripts', 'extraction-output')
  const files = readdirSync(outDir).filter(
    (f) => f.includes(`_${session}_qp_`) && f.endsWith('.json')
  )

  if (!files.length) {
    console.error(`No qp JSON files for session ${session}`)
    process.exit(1)
  }

  let total = 0
  for (const file of files) {
    const payload = JSON.parse(readFileSync(join(outDir, file), 'utf8'))
    const meta = payload.meta
    const sourcePdfPath = payload.sourcePdfPath ?? meta?.sourcePdfPath
    if (!meta || !sourcePdfPath) {
      console.warn(`Skipping ${file}: missing meta/sourcePdfPath`)
      continue
    }

    const parsedMeta = parseQuestionPaperPath(sourcePdfPath)
    if (!parsedMeta) {
      console.warn(`Skipping ${file}: cannot parse path ${sourcePdfPath}`)
      continue
    }

    const questions = (payload.questions ?? []).map((q) => ({
      ...q,
      extraction_method: q.extraction_method ?? 'gemini-pro',
      extraction_confidence: q.extraction_confidence ?? 1,
      needs_manual_review: q.needs_manual_review ?? false,
      needs_re_extraction: q.needs_re_extraction ?? false,
      raw_extraction_data: {
        is_leaf: q.is_leaf,
        paper_kind: meta.paperKind,
        depth: q.depth,
        options: q.options,
      },
    }))

    const { inserted, withParentLink } = await persistExtractedQuestions(
      supabase,
      parsedMeta,
      questions,
      sourcePdfPath
    )
    total += inserted
    console.log(`${file}: persisted ${inserted} (${withParentLink} parent links)`)
  }

  console.log(`Total persisted: ${total}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
