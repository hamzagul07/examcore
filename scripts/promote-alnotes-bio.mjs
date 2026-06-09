#!/usr/bin/env node
/**
 * Promote A-Level Notes biology pilots to published flat JSON (with backup).
 *
 *   pnpm alnotes:bio-promote
 *   pnpm alnotes:bio-promote -- --dry-run
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const PROJECT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SUBJECT = '9700'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

function toPublished(pilot) {
  const lesson = structuredClone(pilot)
  lesson.status = 'premium'
  lesson.generatorVersion = 'alnotes-published-1'
  delete lesson.generatedAt
  return lesson
}

function pilotFiles() {
  const dir = path.join(PROJECT, `content/courses/${SUBJECT}/alnotes-pilots`)
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.pilot.json'))
    .map((f) => ({
      slug: f.replace(/\.pilot\.json$/, ''),
      path: path.join(dir, f),
    }))
}

async function main() {
  const pilots = pilotFiles()
  const backupDir = path.join(PROJECT, `content/courses/${SUBJECT}/_backup-pre-alnotes`)
  const publishDir = path.join(PROJECT, `content/courses/${SUBJECT}`)

  console.log(`Promote ${pilots.length} A-Level Notes pilots → published flat JSON`)
  let ok = 0

  for (const { slug, path: pilotPath } of pilots) {
    const pilot = JSON.parse(fs.readFileSync(pilotPath, 'utf8'))
    if (!pilot.generatorVersion?.startsWith('alnotes-pilot')) {
      console.log(`  skip ${slug} (not an alnotes pilot)`)
      continue
    }

    const dest = path.join(publishDir, `${slug}.json`)
    const published = toPublished(pilot)

    if (dryRun) {
      console.log(`  → ${slug}.json`)
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
    console.log(`Backups: content/courses/${SUBJECT}/_backup-pre-alnotes/`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
