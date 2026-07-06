#!/usr/bin/env node
/** Quick gate check for *.improve.pilot.json drafts vs published originals. */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const { measureLesson, compareImprovementGate } = await import(
  '../lib/courses/run/lesson-improve.ts'
)

const subjectCode = process.argv[2] ?? '9700'
const dir = path.join(ROOT, 'content', 'courses', subjectCode)
const pilots = fs.readdirSync(dir).filter((f) => f.endsWith('.improve.pilot.json'))

let promoteReady = 0
for (const pilotName of pilots) {
  const originalName = pilotName.replace('.improve.pilot.json', '.json')
  const pilotRel = `content/courses/${subjectCode}/${pilotName}`
  const originalRel = `content/courses/${subjectCode}/${originalName}`
  if (!fs.existsSync(path.join(ROOT, originalRel))) {
    console.log(`${pilotName}: SKIP (no original)`)
    continue
  }
  const draft = JSON.parse(fs.readFileSync(path.join(ROOT, pilotRel), 'utf8'))
  const original = JSON.parse(fs.readFileSync(path.join(ROOT, originalRel), 'utf8'))
  const baseline = measureLesson(original, originalRel, subjectCode)
  const draftMetrics = measureLesson(draft, pilotRel, subjectCode)
  const gate = compareImprovementGate(baseline, draftMetrics)
  const status = gate.promote ? 'PROMOTE' : draftMetrics.passed ? 'PASS(no-gate)' : 'FAIL'
  if (gate.promote) promoteReady += 1
  console.log(
    `${originalName.padEnd(52)} ${status.padEnd(14)} baseline:[${baseline.errorCodes.join(',')}] draft:[${draftMetrics.errorCodes.join(',')}]`
  )
  if (!gate.promote && gate.rejectReasons.length) {
    console.log(`  ? ${gate.rejectReasons.join('; ')}`)
  }
}
console.log(`\n${promoteReady}/${pilots.length} ready to promote`)
