#!/usr/bin/env node
/**
 * Scaffold a June 2026 grade-threshold session file from the latest stored session.
 * Edit thresholds + sourceUrl from the official PDF, remove "draft", then ingest.
 *
 * Usage:
 *   node scripts/scaffold-june-2026-session.mjs --code 9709
 *   node scripts/scaffold-june-2026-session.mjs --all
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = path.join(ROOT, 'content', 'data', 'grade-boundaries')
const INCOMING_DIR = path.join(DATA_DIR, 'incoming')
const PRIORITY_CODES = ['9709', '9231', '9700', '9702', '9708', '9701', '9706', '9699', '9084', '9488', '9607', '9618', '4024', '0580', '0610', '0620', '0625', '5090', '5070', '5054', '9695', '0990', '2281', '7115', '7707', '4037', '2210', '9609', '9990', '9489', '9696', '0460']

function parseArgs(argv) {
  const args = { all: false, code: null }
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--all') args.all = true
    else if (argv[i] === '--code') args.code = argv[++i]
  }
  return args
}

function scaffold(code) {
  const srcFile = path.join(DATA_DIR, `${code}.json`)
  if (!fs.existsSync(srcFile)) {
    console.error(`No data file for ${code} — create content/data/grade-boundaries/${code}.json first.`)
    return false
  }

  const data = JSON.parse(fs.readFileSync(srcFile, 'utf8'))
  const latest = data.sessions?.[0]
  if (!latest?.components?.length) {
    console.error(`${code}: no sessions[0] to clone.`)
    return false
  }

  const session = {
    session: 'June 2026',
    sourceUrl: 'PASTE_OFFICIAL_CAMBRIDGE_PDF_URL_HERE',
    draft: true,
    components: latest.components.map((c) => ({
      component: c.component,
      paper: c.paper,
      max: c.max,
      thresholds: { ...c.thresholds },
    })),
  }

  fs.mkdirSync(INCOMING_DIR, { recursive: true })
  const out = path.join(INCOMING_DIR, `${code}-june-2026.json`)
  fs.writeFileSync(out, JSON.stringify(session, null, 2) + '\n')
  console.log(`  wrote ${path.relative(ROOT, out)} (${session.components.length} components — verify thresholds from PDF)`)
  return true
}

function main() {
  const args = parseArgs(process.argv)
  const codes = args.all ? PRIORITY_CODES : args.code ? [args.code] : []

  if (!codes.length) {
    console.error('Usage: --code 9709  |  --all')
    process.exit(1)
  }

  console.log('\nScaffold June 2026 threshold drafts\n')
  let ok = 0
  for (const code of codes) {
    if (scaffold(code)) ok++
  }
  console.log(`\n${ok}/${codes.length} scaffolds written.`)
  console.log('Next: edit incoming/*.json ? remove draft, set sourceUrl ?')
  console.log('  pnpm grade:thresholds:ingest -- --code 9709 --file content/data/grade-boundaries/incoming/9709-june-2026.json\n')
}

main()
