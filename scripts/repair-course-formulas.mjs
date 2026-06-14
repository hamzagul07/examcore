#!/usr/bin/env node
/** Repair unclosed $ delimiters in course formula sections. */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const COURSES = path.join(ROOT, 'content', 'courses')

function repairDelimiters(content) {
  let s = content.trim()
  if (!s) return s
  let count = 0
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '$' && s[i - 1] !== '\\') count++
  }
  if (count % 2 === 1) s += '$'
  return s
}

let files = 0
let repaired = 0

for (const code of fs.readdirSync(COURSES)) {
  const dir = path.join(COURSES, code)
  if (!fs.statSync(dir).isDirectory()) continue

  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue
    const fp = path.join(dir, f)
    const lesson = JSON.parse(fs.readFileSync(fp, 'utf8'))
    if (!Array.isArray(lesson.sections)) continue

    let changed = false
    for (const section of lesson.sections) {
      if (section.type !== 'formula' || !section.content) continue
      const fixed = repairDelimiters(section.content)
      if (fixed !== section.content) {
        section.content = fixed
        changed = true
        repaired++
      }
    }

    if (changed) {
      fs.writeFileSync(fp, JSON.stringify(lesson, null, 2) + '\n')
      files++
    }
  }
}

console.log(`Repaired ${repaired} formula section(s) in ${files} file(s)`)
