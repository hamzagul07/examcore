#!/usr/bin/env node
/** Estimate page counts from PDF file sizes using Gemini on one sample per paper type. */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SESSION = 's24'
const SAMPLES = ['12', '22', '32', '42', '52']

function paperFromComponent(comp) {
  const n = parseInt(comp, 10)
  return n >= 10 ? Math.floor(n / 10) : n
}

async function main() {
  const stats = {}
  for (const comp of SAMPLES) {
    const path = `cambridge/9702/${SESSION}/qp_${comp}.pdf`
    const { data, error } = await supabase.storage.from('paper-pdfs').download(path)
    if (error || !data) {
      stats[comp] = { error: error?.message }
      continue
    }
    const bytes = (await data.arrayBuffer()).byteLength
    stats[comp] = { paper: paperFromComponent(comp), bytes, path }
  }

  const auditPath = join(ROOT, 'scripts/audit-9702-output-clean.json')
  const audit = JSON.parse(
    readFileSync(auditPath, 'utf8').replace(/^\uFEFF/, '')
  )

  const byPaperBytes = { 1: [], 2: [], 3: [], 4: [], 5: [] }
  for (const row of audit.byYearPaperVariant) {
    if (row.hasQp) byPaperBytes[row.paper].push(row)
  }

  console.log(
    JSON.stringify(
      {
        s24SampleBytes: stats,
        qpCountByPaper: audit.qpByPaper,
        totalPdfs: audit.totalPdfFiles,
        totalBytes: audit.totalBytes,
        avgBytesPerPdf: audit.avgBytesPerPdf,
      },
      null,
      2
    )
  )
}

main()
