#!/usr/bin/env node
/**
 * Extract syllabus outcomes for subjects that don't have them yet, gate on real
 * lesson coverage, wire the good ones, and regenerate the index.
 *
 * Designed to be re-run safely (e.g. from CI on a schedule) against the flaky
 * Gemini API: subjects that come back empty or whose extracted numbering doesn't
 * line up with our lesson topic codes are skipped, not wired.
 *
 *   node scripts/extract-and-wire-syllabi.mjs            # all missing subjects
 *   node scripts/extract-and-wire-syllabi.mjs 9609 9708  # specific subjects
 */
import { execFileSync } from 'child_process'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'lib', 'courses', 'syllabus-objectives')
const COURSE_DIR = join(ROOT, 'content', 'courses')
const PDF_DIR = join(ROOT, 'syllabi-source')
const MIN_COVERAGE = 0.4 // wire only if ≥40% of the subject's lessons get outcomes

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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (process.env[k] === undefined) process.env[k] = v
  }
}

function lessonTopicCodes(code) {
  const dir = join(COURSE_DIR, code)
  if (!existsSync(dir)) return []
  const out = []
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    try {
      const tc = JSON.parse(readFileSync(join(dir, f), 'utf8')).topicCode
      if (tc) out.push(String(tc))
    } catch {
      /* skip */
    }
  }
  return out
}

function coverageFor(objectives, topicCodes) {
  const uniq = [...new Set(topicCodes)]
  if (!uniq.length) return 0
  const matched = uniq.filter((tc) =>
    objectives.some((o) => String(o.code).startsWith(`${tc}.`) || String(o.code) === tc)
  ).length
  return matched / uniq.length
}

function discoverMissing() {
  const have = new Set(
    readdirSync(OUT_DIR)
      .filter((f) => /^\d+\.json$/.test(f))
      .map((f) => f.replace('.json', ''))
  )
  return readdirSync(PDF_DIR)
    .filter((f) => /^\d+\.pdf$/.test(f))
    .map((f) => f.replace('.pdf', ''))
    .filter((c) => !have.has(c) && existsSync(join(COURSE_DIR, c)))
    .sort()
}

async function main() {
  loadEnv()
  if (process.env.USE_VERTEX_AI === undefined) process.env.USE_VERTEX_AI = 'false'

  const { setGeminiCallTimeoutMs } = await import('../lib/ai/gemini-text.ts')
  setGeminiCallTimeoutMs(Number(process.env.GEMINI_CALL_TIMEOUT_MS) || 300_000)
  const { extractSyllabus } = await import('../lib/extraction/syllabus-extractor.ts')

  const argCodes = process.argv.slice(2).filter((a) => /^\d+$/.test(a))
  const targets = argCodes.length ? argCodes : discoverMissing()
  console.log(`Targets: ${targets.join(', ') || '(none)'}`)

  const wired = []
  const skipped = []
  for (const code of targets) {
    console.log(`\n=== ${code} ===`)
    let result
    try {
      result = await extractSyllabus({ subjectCode: code, rootDir: ROOT })
    } catch (err) {
      console.log(`  extract error: ${err?.message ?? err}`)
      skipped.push(`${code} (error)`)
      continue
    }
    const slim = (result.objectives || [])
      .map((o) => ({ code: o.objective_number, topic: o.topic_code, text: o.objective_text }))
      .filter((o) => o.code && o.text)
    const cov = coverageFor(slim, lessonTopicCodes(code))
    console.log(`  outcomes=${slim.length} coverage=${(cov * 100).toFixed(0)}%`)
    if (slim.length === 0) {
      skipped.push(`${code} (empty)`)
      continue
    }
    if (cov < MIN_COVERAGE) {
      skipped.push(`${code} (low coverage ${(cov * 100).toFixed(0)}%)`)
      continue
    }
    writeFileSync(join(OUT_DIR, `${code}.json`), JSON.stringify(slim))
    wired.push(`${code} (${slim.length} outcomes, ${(cov * 100).toFixed(0)}%)`)
  }

  if (wired.length) {
    execFileSync('node', [join(ROOT, 'scripts', 'gen-syllabus-index.mjs')], { stdio: 'inherit' })
  }
  console.log(`\nWired: ${wired.join(', ') || '(none)'}`)
  console.log(`Skipped: ${skipped.join(', ') || '(none)'}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
