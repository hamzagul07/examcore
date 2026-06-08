#!/usr/bin/env node
/**
 * Phase 1.5: Mathpix structure samples for P3 + P4 (9702 s24).
 * Run: node scripts/mathpix-sample-papers.mjs
 * Requires: GEMINI_API_KEY (Supabase), MATHPIX_APP_ID, MATHPIX_APP_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { processPdfBuffer } from '../lib/extraction/mathpix-client.mjs'
import { analyzeMmd, analyzeLinesJson } from '../lib/extraction/analyze-mmd.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'scripts', 'mathpix-samples')

const SAMPLES = [
  {
    id: 'p3-practical',
    storagePath: 'cambridge/9702/s24/qp_32.pdf',
    paper: 3,
    label: 'Paper 3 Practical (qp_32)',
  },
  {
    id: 'p4-structured',
    storagePath: 'cambridge/9702/s24/qp_42.pdf',
    paper: 4,
    label: 'Paper 4 Structured (qp_42)',
  },
]

function loadEnvFile(filename) {
  const path = join(ROOT, filename)
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

loadEnvFile('.env.local')

async function downloadPdf(supabase, storagePath) {
  const { data, error } = await supabase.storage.from('paper-pdfs').download(storagePath)
  if (error || !data) throw new Error(`Download failed ${storagePath}: ${error?.message}`)
  return Buffer.from(await data.arrayBuffer())
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  mkdirSync(OUT_DIR, { recursive: true })

  const results = []

  for (const sample of SAMPLES) {
    console.error(`Processing ${sample.label}…`)
    const buffer = await downloadPdf(supabase, sample.storagePath)
    const processed = await processPdfBuffer(buffer, {
      filename: sample.storagePath.split('/').pop(),
    })

    const mmdAnalysis = analyzeMmd(processed.mmd)
    const linesAnalysis = analyzeLinesJson(processed.lines)

    const base = join(OUT_DIR, sample.id)
    writeFileSync(`${base}.mmd`, processed.mmd, 'utf8')
    if (processed.lines) {
      writeFileSync(`${base}.lines.json`, JSON.stringify(processed.lines, null, 2), 'utf8')
    }

    results.push({
      ...sample,
      bytes: buffer.length,
      pdf_id: processed.pdf_id,
      num_pages: processed.num_pages,
      mmd_chars: processed.mmd.length,
      mmd_analysis: mmdAnalysis,
      lines_analysis: linesAnalysis,
      mmd_preview: processed.mmd.slice(0, 2500),
    })
  }

  const outPath = join(OUT_DIR, 'analysis.json')
  writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2))
  console.log(JSON.stringify({ outPath, results: results.map((r) => ({ id: r.id, pages: r.num_pages, max_depth: r.mmd_analysis.max_nesting_depth })) }, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
