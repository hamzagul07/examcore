#!/usr/bin/env node
/**
 * One-off generator: list paper-pdfs storage → lib/subject-papers-cache.json
 * Run: node scripts/generate-subject-papers-cache.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const STORAGE_PREFIXES = [
  { prefix: 'cambridge', level: 'A-Level' },
  { prefix: 'cambridge-o-level', level: 'O-Level' },
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function listFolder(path) {
  const { data, error } = await supabase.storage.from('paper-pdfs').list(path, {
    limit: 1000,
  })
  if (error || !data) return []
  return data.map((d) => d.name)
}

function paperNumberFromComponent(component) {
  const n = parseInt(component, 10)
  if (Number.isNaN(n)) return 0
  if (n >= 10) return Math.floor(n / 10)
  return n
}

function groupComponents(components) {
  const byPaper = new Map()
  for (const c of components.sort()) {
    const paper = paperNumberFromComponent(c)
    if (!byPaper.has(paper)) byPaper.set(paper, [])
    byPaper.get(paper).push(c)
  }
  return [...byPaper.entries()]
    .sort(([a], [b]) => a - b)
    .map(([paper, comps]) => ({
      paper,
      name: `Paper ${paper}`,
      components: comps,
    }))
}

async function scanPrefix(storagePrefix, level) {
  const result = {}
  const subjectFolders = await listFolder(storagePrefix)

  for (const subjectCode of subjectFolders) {
    if (!/^\d{4}$/.test(subjectCode)) continue

    const sessionFolders = await listFolder(`${storagePrefix}/${subjectCode}`)
    const sessions = []
    const allComponents = new Set()

    for (const sessionCode of sessionFolders.sort()) {
      if (!/^[smw]\d{2}$/i.test(sessionCode)) continue
      const files = await listFolder(`${storagePrefix}/${subjectCode}/${sessionCode}`)
      const componentStatus = {}

      for (const fileName of files) {
        const m = fileName.toLowerCase().match(/^(qp|ms)_(.+)\.pdf$/)
        if (!m) continue
        const [, kind, component] = m
        if (!componentStatus[component]) {
          componentStatus[component] = { qp: false, ms: false }
        }
        if (kind === 'qp') componentStatus[component].qp = true
        if (kind === 'ms') componentStatus[component].ms = true
      }

      const components = Object.entries(componentStatus)
        .filter(([, s]) => s.qp && s.ms)
        .map(([c]) => c)
        .sort()

      if (components.length > 0) {
        sessions.push(sessionCode.toLowerCase())
        for (const c of components) allComponents.add(c)
      }
    }

    if (sessions.length === 0) continue

    result[subjectCode] = {
      code: subjectCode,
      level,
      storagePrefix,
      sessions: [...new Set(sessions)].sort(),
      papers: groupComponents([...allComponents]),
    }
  }

  return result
}

async function main() {
  const result = {}

  for (const { prefix, level } of STORAGE_PREFIXES) {
    const scanned = await scanPrefix(prefix, level)
    Object.assign(result, scanned)
    console.log(`  ${prefix}: ${Object.keys(scanned).length} subjects`)
  }

  const outPath = join(ROOT, 'lib', 'subject-papers-cache.json')
  writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n')
  console.log(`Wrote ${Object.keys(result).length} subjects to ${outPath}`)
  for (const [code, data] of Object.entries(result).sort()) {
    console.log(
      `  ${code} (${data.level}): ${data.sessions.length} sessions, ${data.papers.length} paper groups`
    )
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
