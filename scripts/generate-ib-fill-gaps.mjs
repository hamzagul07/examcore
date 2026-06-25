#!/usr/bin/env node
/**
 * Generate missing IB lessons for every syllabus where lesson count < topic count.
 * Skips existing files (same as generate-ib-deep-lesson.mjs).
 *
 * Usage: node --import tsx scripts/generate-ib-fill-gaps.mjs
 *        node --import tsx scripts/generate-ib-fill-gaps.mjs --only=ib-physics-sl
 */
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const only = process.argv.find((a) => a.startsWith('--only='))?.slice('--only='.length)

function listIbSyllabi() {
  return fs
    .readdirSync(path.join(ROOT, 'lib', 'syllabi'))
    .filter((f) => f.startsWith('ib-') && f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort()
}

function lessonGap(subject) {
  const syllabus = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'lib', 'syllabi', `${subject}.json`), 'utf8')
  )
  const topics = syllabus.topics?.length ?? 0
  const outDir = path.join(ROOT, 'content', 'courses', subject)
  const lessons = fs.existsSync(outDir)
    ? fs.readdirSync(outDir).filter((f) => f.endsWith('.json')).length
    : 0
  return topics - lessons
}

function runSubject(subject) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', 'scripts/generate-ib-deep-lesson.mjs', `--subject=${subject}`],
      { cwd: ROOT, stdio: 'inherit', shell: false }
    )
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${subject} exited ${code}`))
    })
  })
}

async function main() {
  const subjects = (only ? [only] : listIbSyllabi()).filter((s) => lessonGap(s) > 0)

  if (!subjects.length) {
    console.log('No IB syllabi with missing lessons.')
    return
  }

  console.log(`Subjects with gaps: ${subjects.join(', ')}`)
  let failed = 0
  for (const subject of subjects) {
    console.log(`\n========== ${subject} (${lessonGap(subject)} missing) ==========\n`)
    try {
      await runSubject(subject)
    } catch (err) {
      failed++
      console.error(err)
    }
  }
  process.exit(failed ? 1 : 0)
}

main()
