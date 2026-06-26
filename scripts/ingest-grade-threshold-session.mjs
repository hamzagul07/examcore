#!/usr/bin/env node
/**
 * Ingest a verified Cambridge grade-threshold session into content/data/grade-boundaries/{code}.json
 *
 * Usage:
 *   node scripts/ingest-grade-threshold-session.mjs --status
 *   node scripts/ingest-grade-threshold-session.mjs --code 9702 --file path/to/june-2026-session.json
 *
 * Session JSON shape (one session object):
 * {
 *   "session": "June 2026",
 *   "sourceUrl": "https://www.cambridgeinternational.org/Images/....pdf",
 *   "components": [
 *     { "component": "11", "paper": "Paper 1", "max": 40, "thresholds": { "A": 32, "B": 29, "C": 26, "D": 22, "E": 18 } }
 *   ]
 * }
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = path.join(ROOT, 'content', 'data', 'grade-boundaries')
const BLOG_DIR = path.join(ROOT, 'content', 'blog')
const JUNE_2026 = 'june 2026'

function parseArgs(argv) {
  const args = { status: false, code: null, file: null, dryRun: false }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--status') args.status = true
    else if (a === '--dry-run') args.dryRun = true
    else if (a === '--code') args.code = argv[++i]
    else if (a === '--file') args.file = argv[++i]
  }
  return args
}

function hasJune2026(sessions) {
  return sessions.some((s) => String(s.session).trim().toLowerCase() === JUNE_2026)
}

function printStatus() {
  if (!fs.existsSync(DATA_DIR)) {
    console.log('No grade-boundaries data directory yet.')
    return
  }
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'))
  const rows = files.map((f) => {
    const code = f.replace(/\.json$/, '')
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'))
    const june = hasJune2026(data.sessions ?? [])
    const latest = data.sessions?.[0]?.session ?? '—'
    return { code, subject: data.subject ?? '—', june, latest, count: data.sessions?.length ?? 0 }
  })
  rows.sort((a, b) => a.code.localeCompare(b.code))
  console.log('\nGrade boundary data status\n')
  for (const r of rows) {
    console.log(
      `  ${r.code} ${r.subject.padEnd(24)} | sessions: ${r.count} | latest: ${r.latest} | June 2026: ${r.june ? 'YES' : 'no'}`
    )
  }
  const live = rows.filter((r) => r.june).length
  console.log(`\n${live}/${rows.length} subjects with verified June 2026 thresholds.\n`)
}

function validateSession(session) {
  if (!session.session || !session.sourceUrl || !Array.isArray(session.components)) {
    throw new Error('Session must include session, sourceUrl, and components[]')
  }
  if (!session.components.length) throw new Error('components[] is empty')
  for (const c of session.components) {
    if (!c.component || !c.paper || typeof c.max !== 'number' || !c.thresholds) {
      throw new Error(`Invalid component: ${JSON.stringify(c)}`)
    }
    for (const g of ['A', 'B', 'C', 'D', 'E']) {
      if (typeof c.thresholds[g] !== 'number') throw new Error(`Missing threshold ${g} on ${c.component}`)
    }
  }
}

function bumpBlogUpdated(code) {
  const prefix = `cambridge-${code}-`
  const posts = fs.readdirSync(BLOG_DIR).filter(
    (f) => f.startsWith(prefix) && f.includes('grade-boundaries') && f.endsWith('.md')
  )
  const today = new Date().toISOString().slice(0, 10)
  for (const file of posts) {
    const full = path.join(BLOG_DIR, file)
    let text = fs.readFileSync(full, 'utf8')
    if (/^updated:\s/m.test(text)) {
      text = text.replace(/^updated:\s*.+$/m, `updated: ${today}`)
    } else {
      text = text.replace(/^(---\n[\s\S]*?)(---)/m, `$1updated: ${today}\n$2`)
    }
    fs.writeFileSync(full, text)
    console.log(`  updated blog frontmatter: ${file}`)
  }
}

function main() {
  const args = parseArgs(process.argv)
  if (args.status) {
    printStatus()
    return
  }

  if (!args.code || !args.file) {
    console.error('Usage: --code 9702 --file session.json  (or --status)')
    process.exit(1)
  }

  const sessionPath = path.resolve(args.file)
  if (!fs.existsSync(sessionPath)) {
    console.error(`File not found: ${sessionPath}`)
    process.exit(1)
  }

  const session = JSON.parse(fs.readFileSync(sessionPath, 'utf8'))
  validateSession(session)

  const outFile = path.join(DATA_DIR, `${args.code}.json`)
  let data
  if (fs.existsSync(outFile)) {
    data = JSON.parse(fs.readFileSync(outFile, 'utf8'))
    if (hasJune2026(data.sessions ?? [])) {
      console.error(`${args.code} already has June 2026 — remove or edit manually before re-ingesting.`)
      process.exit(1)
    }
    data.sessions = [session, ...(data.sessions ?? [])]
  } else {
    console.error(`No existing ${outFile} — create base file with code/subject/level first.`)
    process.exit(1)
  }

  if (args.dryRun) {
    console.log(`[dry-run] Would prepend June 2026 session to ${args.code} (${session.components.length} components)`)
    return
  }

  fs.writeFileSync(outFile, JSON.stringify(data, null, 2) + '\n')
  console.log(`Ingested ${session.session} for ${args.code} (${session.components.length} components)`)
  console.log('Bumping blog updated dates…')
  bumpBlogUpdated(args.code)
  console.log('Done. Verify PDF sourceUrl, then deploy.')
}

main()
