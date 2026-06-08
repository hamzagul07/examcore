#!/usr/bin/env node
/**
 * Phase 0 inventory for Prompt C — 9702 PDFs in paper-pdfs storage.
 * Run: node scripts/audit-9702-pdfs.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

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

function sessionDecode(code) {
  const m = code.toLowerCase().match(/^([smw])(\d{2})$/)
  if (!m) return null
  const year = 2000 + parseInt(m[2], 10)
  const season =
    m[1] === 's'
      ? 'May/June'
      : m[1] === 'w'
        ? 'Oct/Nov'
        : 'Feb/March'
  return { code: code.toLowerCase(), year, season }
}

function decodeComponent(comp) {
  const n = parseInt(comp, 10)
  const paper = n >= 10 ? Math.floor(n / 10) : n
  const variant = comp.length === 2 ? comp[1] : String(n % 10)
  return { paper, variant, component: comp }
}

async function listFolder(path) {
  const { data, error } = await supabase.storage.from('paper-pdfs').list(path, {
    limit: 1000,
  })
  if (error) {
    console.error('list error', path, error.message)
    return []
  }
  return data ?? []
}

async function searchSyllabusPaths() {
  const candidates = []
  const pathsToCheck = [
    'cambridge/9702',
    'syllabuses',
    'syllabuses/9702',
    'cambridge/syllabuses',
    'cambridge/syllabuses/9702',
  ]
  for (const p of pathsToCheck) {
    const files = await listFolder(p)
    for (const f of files) {
      if (/\.pdf$/i.test(f.name) && /9702|syllabus|physics/i.test(f.name)) {
        candidates.push(`${p}/${f.name}`)
      }
    }
  }
  return candidates
}

async function main() {
  const base = 'cambridge/9702'
  const sessionEntries = await listFolder(base)
  const sessionDirs = sessionEntries
    .map((s) => s.name)
    .filter((n) => /^[smw]\d{2}$/i.test(n))
    .sort()

  let totalQp = 0
  let totalMs = 0
  let paired = 0
  const unpaired = []
  const bySession = {}
  const byYearPaperVariant = {}
  const allFiles = []

  for (const sess of sessionDirs) {
    const files = await listFolder(`${base}/${sess}`)
    const status = {}

    for (const f of files) {
      const m = f.name.toLowerCase().match(/^(qp|ms)_(.+)\.pdf$/)
      if (!m) continue
      const [, kind, comp] = m
      if (!status[comp]) {
        status[comp] = { qp: false, ms: false, qpBytes: 0, msBytes: 0 }
      }
      const bytes = f.metadata?.size ?? 0
      if (kind === 'qp') {
        status[comp].qp = true
        status[comp].qpBytes = bytes
        totalQp++
        allFiles.push({
          path: `${base}/${sess}/qp_${comp}.pdf`,
          kind: 'qp',
          session: sess,
          component: comp,
          bytes,
        })
      } else {
        status[comp].ms = true
        status[comp].msBytes = bytes
        totalMs++
        allFiles.push({
          path: `${base}/${sess}/ms_${comp}.pdf`,
          kind: 'ms',
          session: sess,
          component: comp,
          bytes,
        })
      }
    }

    const dec = sessionDecode(sess)
    bySession[sess] = {
      year: dec?.year,
      season: dec?.season,
      pairs: [],
      orphans: [],
    }

    for (const [comp, s] of Object.entries(status)) {
      const { paper, variant } = decodeComponent(comp)
      const key = `${dec?.year ?? '?'}-${dec?.season ?? '?'}-P${paper}-V${variant}`
      if (!byYearPaperVariant[key]) {
        byYearPaperVariant[key] = {
          session: sess,
          component: comp,
          paper,
          variant,
          year: dec?.year,
          season: dec?.season,
          hasQp: false,
          hasMs: false,
        }
      }
      if (s.qp) byYearPaperVariant[key].hasQp = true
      if (s.ms) byYearPaperVariant[key].hasMs = true

      if (s.qp && s.ms) {
        paired++
        bySession[sess].pairs.push(comp)
      } else {
        const orphan = {
          session: sess,
          component: comp,
          hasQp: s.qp,
          hasMs: s.ms,
        }
        unpaired.push(orphan)
        bySession[sess].orphans.push(orphan)
      }
    }
  }

  const byPaper = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const f of allFiles.filter((x) => x.kind === 'qp')) {
    const { paper } = decodeComponent(f.component)
    if (byPaper[paper] !== undefined) byPaper[paper]++
  }

  const syllabusCandidates = await searchSyllabusPaths()
  const rootNonSession = sessionEntries
    .filter((e) => !/^[smw]\d{2}$/i.test(e.name))
    .map((e) => e.name)

  const report = {
    generatedAt: new Date().toISOString(),
    basePath: base,
    sessions: sessionDirs,
    sessionCount: sessionDirs.length,
    totalQpPdfs: totalQp,
    totalMsPdfs: totalMs,
    totalPdfFiles: totalQp + totalMs,
    pairedComponentCount: paired,
    unpairedCount: unpaired.length,
    unpaired,
    qpByPaper: byPaper,
    byYearPaperVariant: Object.values(byYearPaperVariant).sort((a, b) =>
      `${a.year}-${a.season}-P${a.paper}-V${a.variant}`.localeCompare(
        `${b.year}-${b.season}-P${b.paper}-V${b.variant}`
      )
    ),
    bySession,
    rootNonSessionFiles: rootNonSession,
    syllabusCandidates,
    totalBytes: allFiles.reduce((s, f) => s + f.bytes, 0),
    avgBytesPerPdf: Math.round(
      allFiles.reduce((s, f) => s + f.bytes, 0) / Math.max(allFiles.length, 1)
    ),
  }

  const outArg = process.argv.find((a) => a.startsWith('--out='))?.split('=')[1]
  const json = JSON.stringify(report, null, 2)
  if (outArg) {
    writeFileSync(join(ROOT, outArg), json + '\n', 'utf8')
    console.log(`Wrote ${outArg}`)
  } else {
    console.log(json)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
