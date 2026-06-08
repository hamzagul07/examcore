#!/usr/bin/env node
/**
 * Persist linked mark points from existing ms_* extraction JSON (no Gemini re-run).
 *
 * Usage:
 *   npx tsx scripts/persist-mark-schemes-from-json.mjs --session=s24
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
    console.error('Usage: npx tsx scripts/persist-mark-schemes-from-json.mjs --session=s24')
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

  const { persistLinkedMarkPoints } = await import('../lib/extraction/mark-scheme-linker.ts')

  const outDir = join(ROOT, 'scripts', 'extraction-output')
  const files = readdirSync(outDir).filter(
    (f) => f.includes(`_${session}_ms_`) && f.endsWith('.json')
  )

  if (!files.length) {
    console.error(`No ms JSON files for session ${session}`)
    process.exit(1)
  }

  let total = 0
  for (const file of files) {
    const payload = JSON.parse(readFileSync(join(outDir, file), 'utf8'))
    const sourcePdfPath = payload.sourcePdfPath ?? payload.meta?.sourcePdfPath
    const points = payload.markPoints ?? []
    if (!points.length) {
      console.warn(`Skipping ${file}: no markPoints`)
      continue
    }

    const linked = points.map((p) => ({
      id: p.id,
      question_id: p.question_id,
      question_number: p.question_number,
      point_order: p.point_order,
      point_text: p.point_text,
      marks_awarded: p.marks_awarded,
      examiner_notes: p.examiner_notes ?? null,
      alternative_phrasings: p.alternative_phrasings ?? null,
      source_pdf_path: sourcePdfPath,
      source_page_numbers: p.source_page_numbers ?? [],
      section_label: p.section_label ?? null,
    }))

    const { count } = await supabase
      .from('extracted_mark_points')
      .select('id', { count: 'exact', head: true })
      .in(
        'id',
        linked.map((p) => p.id)
      )

    if (count && count > 0) {
      console.log(`${file}: ${count}/${linked.length} already persisted — skip`)
      total += count
      continue
    }

    const inserted = await persistLinkedMarkPoints(supabase, linked)
    console.log(`${file}: persisted ${inserted} mark points`)
    total += inserted
  }

  console.log(`Done — ${total} mark points available in DB`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
