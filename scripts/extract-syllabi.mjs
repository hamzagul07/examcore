#!/usr/bin/env node
/**
 * Extract Cambridge syllabus topic trees from PDFs in syllabi-source/
 * via Gemini, writing lib/syllabi/{code}.json
 *
 * Run: node scripts/extract-syllabi.mjs
 *      node scripts/extract-syllabi.mjs --subject 9702
 *      node scripts/extract-syllabi.mjs --force
 */

import { GoogleGenAI } from '@google/genai'
import {
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from 'fs'
import { dirname, join, basename } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SOURCE_DIR = join(ROOT, 'syllabi-source')
const OUT_DIR = join(ROOT, 'lib', 'syllabi')

/** Skip — Math topic map lives in lib/syllabus.ts */
const SKIP_CODES = new Set(['9709'])

const SUBJECT_NAMES = {
  '9084': 'Law',
  '9231': 'Further Mathematics',
  '9488': 'Islamic Studies',
  '9489': 'History',
  '9607': 'Media Studies',
  '9609': 'Business',
  '9618': 'Computer Science',
  '9699': 'Sociology',
  '9700': 'Biology',
  '9701': 'Chemistry',
  '9702': 'Physics',
  '9706': 'Accounting',
  '9708': 'Economics',
  '9990': 'Psychology',
}

const GEMINI_RETRYABLE_STATUS = [429, 500, 503]
const OVERLOAD_PATTERN =
  /UNAVAILABLE|high demand|RESOURCE_EXHAUSTED|overloaded|rate.?limit/i

function loadEnvFile(filename) {
  const path = join(ROOT, filename)
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

function extractStatus(err) {
  if (!err || typeof err !== 'object') return undefined
  const e = err
  if (typeof e.status === 'number') return e.status
  const nested = e.error
  if (nested && typeof nested.code === 'number') return nested.code
  const response = e.response
  if (response && typeof response.status === 'number') return response.status
  return undefined
}

async function withGeminiRetry(fn, opts = {}) {
  const { maxRetries = 4, baseDelayMs = 1000, label = 'gemini' } = opts
  let lastErr
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const status = extractStatus(err)
      const message = err instanceof Error ? err.message : ''
      const isRetryable =
        (status !== undefined && GEMINI_RETRYABLE_STATUS.includes(status)) ||
        OVERLOAD_PATTERN.test(message)
      if (!isRetryable || attempt === maxRetries) break
      const delay =
        Math.min(baseDelayMs * 2 ** attempt, 15000) + Math.random() * 500
      console.warn(
        `[${label}] retry ${attempt + 1}/${maxRetries}, waiting ${Math.round(delay)}ms`
      )
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastErr
}

function buildExtractionPrompt(subjectCode, subjectName) {
  return `You are extracting the official Cambridge International A-Level syllabus topic structure from this PDF.

Subject code: ${subjectCode}
Subject name: ${subjectName}

Extract the FULL topic hierarchy Cambridge uses in this syllabus document:
- For science subjects: numbered topics (e.g. "1 Physical quantities and units", "2 Kinematics") grouped by paper/unit
- For essay subjects (History, Sociology, Law, etc.): content areas, key questions, themes, or sections — extract whatever hierarchy the document actually presents; do NOT invent fake numbered sub-topics
- Preserve Cambridge's own codes/numbering exactly as printed
- Include AS and A Level content where the syllabus distinguishes them

Return ONLY valid JSON (no markdown, no prose) in this exact shape:
{
  "subjectCode": "${subjectCode}",
  "subjectName": "${subjectName}",
  "topics": [
    {
      "code": "1",
      "paper": "P1",
      "paperName": "Paper 1: Multiple Choice",
      "name": "Physical quantities and units"
    }
  ]
}

Field rules:
- "code": Cambridge topic number/code as a string (e.g. "1", "1.1", "3.2", "A1", "Theme 1")
- "paper": short paper id — use P1, P2, P3… for numbered papers; AS, A2 for level splits; or a short slug if papers are named differently
- "paperName": full official paper/section name from the syllabus
- "name": topic/content area title (without the leading number if the number is in code)
- Flatten to leaf-level topics only (one row per assessable topic). Include sub-topics as separate rows if Cambridge numbers them separately.
- Aim for completeness — every numbered syllabus topic should appear
- Do not include administrative sections (introduction, assessment overview, command words glossary)`
}

function parseGeminiJson(text) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0])
  } catch {
    return null
  }
}

function assessQuality(data, subjectCode) {
  const topics = data?.topics
  if (!Array.isArray(topics) || topics.length === 0) {
    return { quality: 'failed', reason: 'no topics array' }
  }

  let valid = 0
  const codes = new Set()
  for (const t of topics) {
    if (
      typeof t.code === 'string' &&
      t.code.trim() &&
      typeof t.name === 'string' &&
      t.name.trim() &&
      typeof t.paper === 'string' &&
      typeof t.paperName === 'string'
    ) {
      valid++
      codes.add(t.code.trim())
    }
  }

  const ratio = valid / topics.length
  if (valid < 3) {
    return { quality: 'failed', reason: `only ${valid} valid topics` }
  }
  if (ratio < 0.8) {
    return {
      quality: 'sparse',
      reason: `${valid}/${topics.length} valid rows (${Math.round(ratio * 100)}%)`,
    }
  }

  const essayCodes = ['9489', '9699', '9084', '9488', '9607']
  if (essayCodes.includes(subjectCode) && topics.length < 8) {
    return {
      quality: 'needs_review',
      reason: `essay subject with only ${topics.length} topics — verify content areas captured`,
    }
  }

  if (topics.length < 5) {
    return {
      quality: 'sparse',
      reason: `only ${topics.length} topics extracted`,
    }
  }

  return { quality: 'clean', topicCount: valid }
}

function normalizeTopics(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  const seen = new Set()
  for (const t of raw) {
    if (!t || typeof t !== 'object') continue
    const code = String(t.code ?? '').trim()
    const name = String(t.name ?? '').trim()
    const paper = String(t.paper ?? 'P1').trim()
    const paperName = String(t.paperName ?? paper).trim()
    if (!code || !name) continue
    if (seen.has(code)) continue
    seen.add(code)
    out.push({ code, paper, paperName, name })
  }
  return out
}

async function extractSubject(genAI, subjectCode, subjectName) {
  const pdfPath = join(SOURCE_DIR, `${subjectCode}.pdf`)
  if (!existsSync(pdfPath)) {
    return { subjectCode, status: 'missing_pdf' }
  }

  const base64 = readFileSync(pdfPath).toString('base64')
  const prompt = buildExtractionPrompt(subjectCode, subjectName)

  const response = await withGeminiRetry(
    () =>
      genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'application/pdf', data: base64 } },
              { text: prompt },
            ],
          },
        ],
      }),
    { label: `extract-${subjectCode}` }
  )

  const text = response.text || ''
  const parsed = parseGeminiJson(text)
  if (!parsed) {
    return {
      subjectCode,
      status: 'parse_error',
      raw: text.slice(0, 400),
    }
  }

  const topics = normalizeTopics(parsed.topics)
  const payload = {
    subjectCode,
    subjectName: subjectName || parsed.subjectName || subjectCode,
    extractedAt: new Date().toISOString(),
    topics,
  }

  const assessment = assessQuality(payload, subjectCode)
  writeFileSync(
    join(OUT_DIR, `${subjectCode}.json`),
    JSON.stringify(payload, null, 2) + '\n',
    'utf8'
  )

  return { subjectCode, status: 'ok', ...assessment, topicCount: topics.length }
}

function listAvailablePdfs() {
  if (!existsSync(SOURCE_DIR)) return []
  return readdirSync(SOURCE_DIR)
    .filter((f) => f.endsWith('.pdf'))
    .map((f) => basename(f, '.pdf'))
    .filter((code) => !SKIP_CODES.has(code))
    .sort()
}

async function main() {
  loadEnvFile('.env.local')

  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not set in .env.local')
    process.exit(1)
  }

  mkdirSync(OUT_DIR, { recursive: true })

  const filterSubject =
    process.argv.find((a) => a.startsWith('--subject='))?.split('=')[1] ||
    (process.argv.includes('--subject')
      ? process.argv[process.argv.indexOf('--subject') + 1]
      : null)
  const force = process.argv.includes('--force')

  const available = listAvailablePdfs()
  console.log('\n=== Syllabi source PDFs ===')
  console.log(`Found ${available.length} PDF(s) in syllabi-source/:`)
  for (const code of available) {
    console.log(`  ✓ ${code}.pdf`)
  }
  console.log(`Skipped (existing topic map): 9709`)
  const expected = [
    '9700', '9701', '9702', '9708', '9489', '9699', '9990', '9609',
    '9706', '9618', '9084', '9488', '9607', '9231',
  ]
  const missing = expected.filter((c) => !available.includes(c))
  if (missing.length) {
    console.log(`Missing PDFs (not processed): ${missing.join(', ')}`)
  }

  let codes = available
  if (filterSubject) {
    codes = codes.filter((c) => c === filterSubject)
    if (codes.length === 0) {
      console.error(`No PDF for subject ${filterSubject}`)
      process.exit(1)
    }
  }

  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  const results = []

  for (const code of codes) {
    const outPath = join(OUT_DIR, `${code}.json`)
    if (!force && existsSync(outPath)) {
      console.log(`\n[${code}] skipping — ${outPath} exists (use --force)`)
      results.push({ subjectCode: code, status: 'skipped' })
      continue
    }

    const name = SUBJECT_NAMES[code] || code
    console.log(`\n[${code}] extracting ${name}…`)
    try {
      const result = await extractSubject(genAI, code, name)
      results.push(result)
      if (result.status === 'ok') {
        console.log(
          `  → ${result.quality}: ${result.topicCount} topics${result.reason ? ` (${result.reason})` : ''}`
        )
      } else {
        console.log(`  → ${result.status}${result.reason ? `: ${result.reason}` : ''}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  → ERROR: ${msg}`)
      results.push({ subjectCode: code, status: 'error', reason: msg })
    }
  }

  console.log('\n=== Extraction summary ===')
  for (const r of results) {
    const detail =
      r.status === 'ok'
        ? `${r.quality} (${r.topicCount} topics)`
        : r.status
    console.log(`  ${r.subjectCode}: ${detail}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
