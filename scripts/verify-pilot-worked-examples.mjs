#!/usr/bin/env node
/**
 * Verify workedExample sourceQuestionId traceability for pilot lessons.
 */
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const p = join(ROOT, '.env.local')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (process.env[k] === undefined) process.env[k] = v
  }
}

function normalizeText(s) {
  return s
    .replace(/\s+/g, ' ')
    .replace(/\\,/g, ',')
    .trim()
    .toLowerCase()
}

function textOverlap(a, b) {
  const na = normalizeText(a)
  const nb = normalizeText(b)
  if (na === nb) return 1
  if (na.includes(nb.slice(0, 80)) || nb.includes(na.slice(0, 80))) return 0.9
  const wordsA = new Set(na.split(/\W+/).filter((w) => w.length > 4))
  const wordsB = new Set(nb.split(/\W+/).filter((w) => w.length > 4))
  if (!wordsA.size || !wordsB.size) return 0
  let hit = 0
  for (const w of wordsA) if (wordsB.has(w)) hit++
  return hit / Math.max(wordsA.size, wordsB.size)
}

const FILES = [
  { paper: '2', path: 'content/courses/9702/paper-2/7-1-progressive-waves.pilot.json' },
  { paper: '5', path: 'content/courses/9702/paper-5/1-3-errors-and-uncertainties.pilot.json' },
]

async function main() {
  loadEnv()
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  for (const { paper, path: rel } of FILES) {
    const full = join(ROOT, rel)
    const lesson = JSON.parse(readFileSync(full, 'utf8'))
    const worked = lesson.sections.filter((s) => s.type === 'workedExample')
    console.log(`\n=== P${paper} ${lesson.slug} (${worked.length} worked examples) ===`)

    for (const [i, ex] of worked.entries()) {
      const id = ex.sourceQuestionId
      console.log(`\n#${i + 1} sourceQuestionId: ${id ?? '(missing)'}`)
      if (!id) {
        console.log('  FAIL: no sourceQuestionId')
        continue
      }

      const { data, error } = await supabase
        .from('extracted_questions')
        .select('id, paper_number, question_number, question_text, subject_code')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        console.log(`  FAIL: DB error ${error.message}`)
        continue
      }
      if (!data) {
        console.log('  FAIL: ID not found in extracted_questions')
        continue
      }
      if (data.paper_number !== paper) {
        console.log(
          `  FAIL: paper_number mismatch DB=${data.paper_number} expected=${paper}`
        )
        continue
      }

      const overlap = textOverlap(ex.question, data.question_text)
      console.log(`  OK: row exists P${data.paper_number} Q${data.question_number}`)
      console.log(`  Text overlap score: ${(overlap * 100).toFixed(0)}%`)
      if (overlap < 0.5) {
        console.log('  WARN: question text diverges from DB')
        console.log(`  DB (first 200): ${data.question_text.slice(0, 200)}`)
        console.log(`  Lesson (first 200): ${ex.question.slice(0, 200)}`)
      }
      console.log(`  Solution source: mark points concatenated (${ex.solution.split('\n').length} lines)`)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
