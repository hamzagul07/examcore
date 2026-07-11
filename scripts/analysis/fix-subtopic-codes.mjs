#!/usr/bin/env node
// Deterministic subtopic-code repair for Math AA question banks.
// In Math AA, each official sub-topic NUMBER (e.g. 5.6, 4.13) exists at exactly
// ONE level (SL or AHL) — so the number uniquely determines the correct level.
// The generator often mislabeled the level (e.g. "AHL 5.6" where 5.6 is SL).
// This normalizes every syllabusRef's level prefix from the canonical set built
// from the official rdojo folder structure. Numbers not in the canon are left
// and reported for human review (their sub-topic number, not just level, is off).
// Usage: node scripts/analysis/fix-subtopic-codes.mjs [--apply]
import fs from 'node:fs'
import path from 'node:path'
import glob from 'node:fs'

const ROOT = '/Users/hamzagul/Documents/examcore'
const APPLY = process.argv.includes('--apply')

function listDirs(p) { try { return fs.readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) } catch { return [] } }

// Canonical number -> level, from official rdojo sub-topic folder names.
const numToLevel = new Map()
for (const base of ['markschemehamza/questionbank/ib-math-aa', 'markschemehamza/notes/ib-math-aa']) {
  for (const group of listDirs(path.join(ROOT, base))) {
    for (const sub of listDirs(path.join(ROOT, base, group))) {
      const m = sub.match(/^(sl|ahl)-(\d+)-(\d+)/)
      if (m) numToLevel.set(`${m[2]}.${m[3]}`, m[1].toUpperCase())
    }
  }
}

function pilotFiles() {
  const out = []
  for (const dir of ['ib-maths-aa-hl', 'ib-maths-aa-sl']) {
    const full = path.join(ROOT, 'content/courses', dir)
    for (const f of fs.readdirSync(full)) if (f.endsWith('.pilot.json')) out.push(path.join(full, f))
  }
  return out
}

let fixed = 0, alreadyOk = 0, unknownNum = 0
const unknowns = []
for (const file of pilotFiles()) {
  const d = JSON.parse(fs.readFileSync(file, 'utf8'))
  let touched = false
  const fixRef = (ref) => {
    if (!ref) return ref
    const m = String(ref).match(/(\d+)\.(\d+)/)
    if (!m) return ref
    const num = `${m[1]}.${m[2]}`
    const level = numToLevel.get(num)
    if (!level) { unknownNum++; unknowns.push(`${path.basename(file)}: ${ref}`); return ref }
    const corrected = `${level} ${num}`
    if (corrected === ref.trim()) { alreadyOk++; return ref }
    fixed++; touched = true; return corrected
  }
  for (const q of d.questionBank ?? []) q.syllabusRef = fixRef(q.syllabusRef)
  for (const s of d.subtopics ?? []) if (s.code) s.code = fixRef(s.code)
  if (touched && APPLY) fs.writeFileSync(file, JSON.stringify(d, null, 2))
}

console.log(`Canonical codes: ${numToLevel.size}`)
console.log(`${APPLY ? 'APPLIED' : 'DRY RUN'} — level-prefix corrected: ${fixed} | already correct: ${alreadyOk} | number-not-in-syllabus (needs human): ${unknownNum}`)
if (unknowns.length) { console.log('\nUnknown numbers (sub-topic number itself may be wrong):'); for (const u of [...new Set(unknowns)].slice(0, 20)) console.log('  ' + u) }
