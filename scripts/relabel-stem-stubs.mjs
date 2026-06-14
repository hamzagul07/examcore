#!/usr/bin/env node
/** Relabel thin STEM stubs from premium → outline. */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const PROJECT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const TARGET_CODES = ['9701', '9618', '9709']
const DRY_RUN = process.argv.includes('--dry-run')

function isThinStub(raw) {
  const hasWorked =
    raw.includes('"type": "workedExample"') || raw.includes('"type":"workedExample"')
  if (hasWorked) return false

  let lesson
  try {
    lesson = JSON.parse(raw)
  } catch {
    return false
  }

  if (lesson.status !== 'premium') return false

  const sections = lesson.sections ?? []
  if (sections.length > 5) return false

  const types = sections.map((s) => s.type)
  const allowed = new Set(['intro', 'practice', 'resources', 'heading', 'text', 'keyPoints', 'examTip'])
  return types.every((t) => allowed.has(t))
}

let relabeled = 0

for (const code of TARGET_CODES) {
  const dir = path.join(PROJECT, 'content', 'courses', code)
  if (!fs.existsSync(dir)) continue

  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json') || f.endsWith('.pilot.json')) continue
    const fp = path.join(dir, f)
    const raw = fs.readFileSync(fp, 'utf8')
    if (!isThinStub(raw)) continue

    const lesson = JSON.parse(raw)
    lesson.status = 'outline'
    lesson.summary = lesson.summary?.replace(/[Pp]remium/g, 'Outline') ?? lesson.summary
    if (!lesson.summary?.includes('Outline')) {
      lesson.summary = `[Outline] ${lesson.summary ?? lesson.title}`
    }

    if (DRY_RUN) {
      console.log(`[dry-run] would relabel ${code}/${f}`)
    } else {
      fs.writeFileSync(fp, JSON.stringify(lesson, null, 2) + '\n')
      console.log(`Relabeled ${code}/${f} → outline`)
    }
    relabeled++
  }
}

console.log(`\n${DRY_RUN ? 'Would relabel' : 'Relabeled'} ${relabeled} stub(s)`)
