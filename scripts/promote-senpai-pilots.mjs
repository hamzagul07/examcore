#!/usr/bin/env node
/**
 * Promote Senpai pilot lessons to published flat JSON (with backup).
 *
 *   pnpm senpai:promote
 *   pnpm senpai:promote -- --dry-run
 *   pnpm senpai:promote -- --paper 2
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')
const SUBJECT = '9702'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const paperFilter = args.includes('--paper') ? args[args.indexOf('--paper') + 1] : null

const syllabus = JSON.parse(
  fs.readFileSync(path.join(PROJECT, 'lib/syllabi/9702.json'), 'utf8')
)
const topicByCode = new Map(syllabus.topics.map((t) => [t.code, t]))

function topicToSlug(topicCode, topicName) {
  const namePart = topicName
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${topicCode.replace(/\./g, '-')}-${namePart}`
}

function pilotFiles() {
  const out = []
  const subjectDir = path.join(PROJECT, 'content/courses', SUBJECT)
  for (const entry of fs.readdirSync(subjectDir)) {
    const m = entry.match(/^paper-(\d+)$/)
    if (!m) continue
    if (paperFilter && m[1] !== paperFilter) continue
    const dir = path.join(subjectDir, entry)
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.pilot.json')) continue
      out.push({ paper: m[1], path: path.join(dir, file), slug: file.replace(/\.pilot\.json$/, '') })
    }
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug))
}

function toPublished(pilot) {
  const topic = topicByCode.get(pilot.topicCode)
  const published = structuredClone(pilot)
  published.status = 'premium'
  published.paper = topic?.paper ?? published.paper
  published.paperName = topic?.paperName ?? published.paperName
  published.generatorVersion = 'senpai-published-1'
  published.updated = new Date().toISOString().slice(0, 10)
  delete published.generatedAt
  return published
}

async function main() {
  const pilots = pilotFiles()
  const backupDir = path.join(PROJECT, `content/courses/${SUBJECT}/_backup-pre-senpai`)
  const publishDir = path.join(PROJECT, `content/courses/${SUBJECT}`)

  console.log(`Promote ${pilots.length} Senpai pilots → published flat JSON`)
  let ok = 0

  for (const { paper, path: pilotPath, slug } of pilots) {
    const pilot = JSON.parse(fs.readFileSync(pilotPath, 'utf8'))
    if (!pilot.generatorVersion?.startsWith('senpai-pilot')) {
      console.log(`  skip ${slug} (not a senpai pilot)`)
      continue
    }

    const dest = path.join(publishDir, `${slug}.json`)
    const published = toPublished(pilot)

    if (dryRun) {
      console.log(`  → paper-${paper} ${slug} → ${slug}.json`)
      ok++
      continue
    }

    if (fs.existsSync(dest)) {
      fs.mkdirSync(backupDir, { recursive: true })
      const backup = path.join(backupDir, `${slug}.json`)
      if (!fs.existsSync(backup)) {
        fs.copyFileSync(dest, backup)
      }
    }

    fs.writeFileSync(dest, `${JSON.stringify(published, null, 2)}\n`)
    console.log(`  ✓ ${slug}`)
    ok++
  }

  console.log(`\nDone: ${ok} promoted${dryRun ? ' (dry run)' : ''}`)
  if (!dryRun && ok) {
    console.log(`Backups: content/courses/${SUBJECT}/_backup-pre-senpai/`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
