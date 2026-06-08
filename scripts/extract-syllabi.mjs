#!/usr/bin/env node
/**
 * Extract Cambridge syllabus parent → leaf trees from PDFs in syllabi-source/
 * via Gemini, writing lib/syllabi/{code}.json
 *
 * Run: node scripts/extract-syllabi.mjs
 *      node scripts/extract-syllabi.mjs --subject 9702
 *      node scripts/extract-syllabi.mjs --force
 */

import { GoogleGenAI } from '@google/genai'
import { GEMINI_PRO_MODEL } from '../lib/ai/gemini-models.mjs'
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

/** Skip — Math topic map lives in lib/syllabus.ts unless 9709.pdf is added */
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

/** Expected leaf counts [min, max] — Sprint B bullet-level grain targets */
const EXPECTED_LEAF_RANGES = {
  '9084': [60, 120],
  '9231': [40, 90],
  '9488': [35, 70],
  '9489': [50, 150],
  '9607': [30, 70],
  '9609': [80, 180],
  '9618': [70, 140],
  '9699': [50, 100],
  '9700': [150, 250],
  '9701': [150, 250],
  '9702': [130, 200],
  '9706': [50, 100],
  '9708': [100, 180],
  '9990': [80, 150],
}

const FINE_GRAIN_BIOLOGY_EXAMPLE = `EXAMPLE — Cambridge Biology Topic 1 "Cell structure" granularity (EACH bullet = one leaf):
Parent "1" Cell structure must have leaves like:
- 1.1.1 "make temporary preparations of cellular material, including stained samples for light microscopy"
- 1.1.2 "draw cells from microscope slides and photomicrographs"
- 1.1.3 "calculate magnifications and actual sizes of specimens"
- 1.1.4 "use an eyepiece graticule and stage micrometer scale to make measurements"
- 1.1.5 "define resolution and magnification and explain differences"
- 1.1.6 "recognise organelles and outline their structures and functions: cell surface membrane"
- (continue for ALL bullets under 1.1, then ALL bullets under 1.2, etc.)
This is the required grain for ALL science topics — NOT just one leaf per numbered sub-topic heading.`

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

function buildExtractionPrompt(
  subjectCode,
  subjectName,
  { strict = false, expand = false, fineGrain = false } = {}
) {
  const range = EXPECTED_LEAF_RANGES[subjectCode]
  const rangeHint = range
    ? `Target ${range[0]}–${range[1]} leaf rows for this subject.`
    : 'Aim for a complete but not over-granular leaf set.'

  const econNote =
    subjectCode === '9708'
      ? `
ECONOMICS-SPECIFIC: Cambridge lists many bullet points under each numbered sub-topic.
- Parents = major syllabus sections (e.g. "1 Basic economic ideas", "3 Microeconomics", "7 Macroeconomics", "10 International trade").
- Leaves = numbered sub-topics only (e.g. 1.1, 3.2, 7.4) — NOT every bullet sentence as its own row.
- Do NOT produce 200+ leaves from bullet lists. Group under sensible parents.`
      : ''

  const historyNote =
    ['9489', '9699', '9084', '9488'].includes(subjectCode)
      ? `
ESSAY/HUMANITIES: Parents = paper option or outline study (e.g. "P2 European option").
Leaves = key content themes / periods / sub-questions Cambridge lists under each outline study (typically 4-12 per parent) — NOT one leaf for an entire outline study, NOT every footnote bullet.`
      : ''

  const scienceNote = ['9700', '9701', '9702'].includes(subjectCode)
    ? `
SCIENCE: Parents = major numbered topics (e.g. "1 Cell structure", "2 Kinematics").
Leaves = EVERY specification bullet / learning outcome Cambridge prints — use codes like 1.1.1, 1.1.2, 2.1.1 when bullets are not separately numbered in the PDF.
Do NOT collapse multiple bullets into one leaf. Topic 1 Biology alone should have 25-35+ leaves, not 2.`
    : ''

  const fineGrainNote = fineGrain
    ? `
FINE-GRAIN PASS (Sprint B): Previous extraction was too coarse (major topics only).
${['9700', '9701', '9702'].includes(subjectCode) ? FINE_GRAIN_BIOLOGY_EXAMPLE : ''}
Extract at bullet-by-bullet specification grain. Each assessable learning outcome = one leaf row.`
    : ''

  const strictNote = strict
    ? `
REFINEMENT PASS: Previous output had quality issues (too many leaves, missing parents, or bad grouping).
Reduce granularity — merge bullet-level rows into proper numbered leaves only. Ensure every leaf has a valid parent code.`
    : ''

  const expandNote = expand
    ? `
COMPLETENESS PASS: Previous output had too few leaves. Include every Cambridge numbered sub-topic (e.g. 1.1, 1.2, 3.4.1) as separate leaf rows — still NOT individual bullet sentences. Target the full numbered syllabus list.`
    : ''

  return `You are extracting the official Cambridge International A-Level syllabus structure from this PDF.

Subject code: ${subjectCode}
Subject name: ${subjectName}

Extract a TWO-LEVEL hierarchy:
1. **parents** — Cambridge major topics / sections / paper themes (the headings students recognise)
2. **topics** (leaves) — assessable sub-topics tagged in marking; each leaf MUST reference its parent code

${rangeHint}
${econNote}
${historyNote}
${scienceNote}
${fineGrainNote}
${strictNote}
${expandNote}

Return ONLY valid JSON (no markdown, no prose) in this exact shape:
{
  "subjectCode": "${subjectCode}",
  "subjectName": "${subjectName}",
  "parents": [
    {
      "code": "17",
      "paper": "P4",
      "paperName": "Paper 4: A Level Structured Questions",
      "name": "Oscillations"
    }
  ],
  "topics": [
    {
      "code": "17.1",
      "parent": "17",
      "paper": "P4",
      "paperName": "Paper 4: A Level Structured Questions",
      "name": "Simple harmonic oscillations"
    }
  ]
}

Field rules:
- "code" on parents: Cambridge major topic number/code (e.g. "1", "3.2", "Theme 1", "European_P2")
- "parent" on leaves: MUST match a parent "code" exactly
- "code" on leaves: Cambridge sub-topic code (e.g. "1.1", "17.3", "3.2.1")
- "paper": short id — P1, P2, … or AS, A2, or a short slug for options
- "paperName": full official paper/section name
- "name": title without repeating the code prefix
- Leaves only — one row per assessable sub-topic Cambridge numbers separately
- Do not include introduction, assessment overview, command words, or appendix admin text
- Preserve Cambridge numbering exactly as printed`
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

function inferParentCode(leafCode, parentCodes) {
  const sorted = [...parentCodes].sort(
    (a, b) => b.split('.').length - a.split('.').length || b.length - a.length
  )
  for (const p of sorted) {
    if (leafCode === p) continue
    if (leafCode.startsWith(`${p}.`)) return p
  }
  const parts = leafCode.split('.')
  while (parts.length > 1) {
    parts.pop()
    const candidate = parts.join('.')
    if (parentCodes.has(candidate)) return candidate
  }
  return null
}

function normalizeRow(t, requireParent = false) {
  if (!t || typeof t !== 'object') return null
  const code = String(t.code ?? '').trim()
  const name = String(t.name ?? '').trim()
  const paper = String(t.paper ?? '').trim() || 'P1'
  const paperName = String(t.paperName ?? paper).trim()
  const parent = String(t.parent ?? '').trim()
  if (!code || !name) return null
  if (requireParent && !parent) return null
  return { code, name, paper, paperName, ...(parent ? { parent } : {}) }
}

function normalizeTree(parsed) {
  const rawParents = Array.isArray(parsed.parents) ? parsed.parents : []
  const rawTopics = Array.isArray(parsed.topics) ? parsed.topics : []

  const parents = []
  const parentByCode = new Map()
  const seenParent = new Set()

  for (const p of rawParents) {
    const row = normalizeRow(p, false)
    if (!row || seenParent.has(row.code)) continue
    seenParent.add(row.code)
    const { parent: _drop, ...parentRow } = row
    parents.push(parentRow)
    parentByCode.set(row.code, parentRow)
  }

  const leaves = []
  const seenLeaf = new Set()
  for (const t of rawTopics) {
    const row = normalizeRow(t, false)
    if (!row || seenLeaf.has(row.code)) continue
    seenLeaf.add(row.code)
    leaves.push(row)
  }

  const parentCodes = new Set(parents.map((p) => p.code))

  for (const leaf of leaves) {
    if (!leaf.parent) {
      const inferred = inferParentCode(leaf.code, parentCodes)
      if (inferred) leaf.parent = inferred
    }
    if (leaf.parent && !parentByCode.has(leaf.parent)) {
      const p = parents.find((x) => x.code === leaf.parent)
      if (!p) {
        parents.push({
          code: leaf.parent,
          name: leaf.parent,
          paper: leaf.paper,
          paperName: leaf.paperName,
        })
        parentByCode.set(leaf.parent, parents[parents.length - 1])
        parentCodes.add(leaf.parent)
      }
    }
  }

  for (const leaf of leaves) {
    if (!leaf.parent) {
      const inferred = inferParentCode(leaf.code, parentCodes)
      if (inferred) leaf.parent = inferred
    }
    if (leaf.parent && parentByCode.has(leaf.parent)) {
      const p = parentByCode.get(leaf.parent)
      if (!leaf.paper && p.paper) leaf.paper = p.paper
      if (!leaf.paperName && p.paperName) leaf.paperName = p.paperName
    }
  }

  const finalLeaves = leaves.filter((l) => l.parent && parentByCode.has(l.parent))

  return { parents, topics: finalLeaves }
}

function assessQuality(data, subjectCode) {
  const parents = data?.parents ?? []
  const topics = data?.topics ?? []
  if (!Array.isArray(topics) || topics.length === 0) {
    return { quality: 'failed', reason: 'no topics array', needsRetry: true }
  }

  let valid = 0
  let missingParent = 0
  let emptyPaper = 0
  const parentLeafCount = new Map()

  for (const t of topics) {
    if (
      typeof t.code === 'string' &&
      t.code.trim() &&
      typeof t.name === 'string' &&
      t.name.trim() &&
      typeof t.paper === 'string' &&
      t.paper.trim() &&
      typeof t.paperName === 'string' &&
      typeof t.parent === 'string' &&
      t.parent.trim()
    ) {
      valid++
      parentLeafCount.set(t.parent, (parentLeafCount.get(t.parent) || 0) + 1)
      if (!t.paper.trim()) emptyPaper++
    } else if (!t.parent?.trim()) {
      missingParent++
    }
  }

  const ratio = valid / topics.length
  if (valid < 3) {
    return {
      quality: 'failed',
      reason: `only ${valid} valid leaves`,
      needsRetry: true,
    }
  }
  if (ratio < 0.85) {
    return {
      quality: 'sparse',
      reason: `${valid}/${topics.length} valid leaves`,
      needsRetry: true,
    }
  }

  const range = EXPECTED_LEAF_RANGES[subjectCode]
  if (range && (valid < range[0] || valid > range[1])) {
    return {
      quality: 'needs_review',
      reason: `leaf count ${valid} outside expected ${range[0]}–${range[1]}`,
      needsRetry:
        valid > range[1] * 1.15 ||
        valid < range[0] * 0.85,
    }
  }

  const orphanParents = parents.filter(
    (p) => !parentLeafCount.has(p.code)
  ).length
  if (orphanParents > 0) {
    return {
      quality: 'needs_review',
      reason: `${orphanParents} parent(s) with 0 leaves`,
      needsRetry: false,
    }
  }

  if (parentLeafCount.size === 1 && valid > 15) {
    return {
      quality: 'needs_review',
      reason: 'all leaves under a single parent',
      needsRetry: true,
    }
  }

  if (missingParent > 0 || emptyPaper > 0) {
    return {
      quality: 'needs_review',
      reason: `${missingParent} missing parent, ${emptyPaper} empty paper`,
      needsRetry: missingParent > valid * 0.1,
    }
  }

  const maxShare = Math.max(...parentLeafCount.values()) / valid
  if (maxShare > 0.65 && parentLeafCount.size > 2) {
    return {
      quality: 'needs_review',
      reason: 'one parent holds >65% of leaves',
      needsRetry: subjectCode === '9708',
    }
  }

  return { quality: 'clean', topicCount: valid, parentCount: parents.length }
}

async function extractSubject(
  genAI,
  subjectCode,
  subjectName,
  { strict = false, expand = false, fineGrain = false } = {}
) {
  const pdfPath = join(SOURCE_DIR, `${subjectCode}.pdf`)
  if (!existsSync(pdfPath)) {
    return { subjectCode, status: 'missing_pdf' }
  }

  const base64 = readFileSync(pdfPath).toString('base64')
  const prompt = buildExtractionPrompt(subjectCode, subjectName, {
    strict,
    expand,
    fineGrain,
  })

  const response = await withGeminiRetry(
    () =>
      genAI.models.generateContent({
        model: GEMINI_PRO_MODEL,
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
    {
      label: `extract-${subjectCode}${fineGrain ? '-fine' : strict ? '-strict' : expand ? '-expand' : ''}`,
    }
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

  const { parents, topics } = normalizeTree(parsed)
  const payload = {
    subjectCode,
    subjectName: subjectName || parsed.subjectName || subjectCode,
    extractedAt: new Date().toISOString(),
    parents,
    topics,
  }

  const assessment = assessQuality(payload, subjectCode)
  writeFileSync(
    join(OUT_DIR, `${subjectCode}.json`),
    JSON.stringify(payload, null, 2) + '\n',
    'utf8'
  )

  return {
    subjectCode,
    status: 'ok',
    ...assessment,
    topicCount: topics.length,
    parentCount: parents.length,
    strict,
    expand,
  }
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
  const fineGrain =
    process.argv.includes('--fine-grain') || process.argv.includes('--fine')

  const available = listAvailablePdfs()
  console.log('\n=== Syllabi source PDFs ===')
  console.log(`Found ${available.length} PDF(s) in syllabi-source/:`)
  for (const code of available) {
    console.log(`  ✓ ${code}.pdf`)
  }
  const has9709 = existsSync(join(SOURCE_DIR, '9709.pdf'))
  console.log(
    has9709
      ? '9709.pdf present — would extract Math (not in SKIP_CODES if added)'
      : 'Skipped (existing topic map): 9709 — lib/syllabus.ts'
  )

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
  const secondPass = []

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
      let result = await extractSubject(genAI, code, name, { fineGrain })
      if (result.status === 'ok' && result.needsRetry) {
        const range = EXPECTED_LEAF_RANGES[code]
        const under =
          range && result.topicCount < range[0] * 0.85
        const mode = under ? 'expand' : 'strict'
        console.log(`  → retrying with ${mode} prompt (${result.reason})`)
        result = await extractSubject(genAI, code, name, {
          strict: !under,
          expand: under,
        })
        secondPass.push(`${code}(${mode})`)
      }
      results.push(result)
      if (result.status === 'ok') {
        console.log(
          `  → ${result.quality}: ${result.topicCount} leaves, ${result.parentCount} parents${result.reason ? ` (${result.reason})` : ''}`
        )
      } else {
        console.log(
          `  → ${result.status}${result.reason ? `: ${result.reason}` : ''}`
        )
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
        ? `${r.quality} (${r.topicCount} leaves, ${r.parentCount} parents)`
        : r.status
    console.log(`  ${r.subjectCode}: ${detail}`)
  }
  if (secondPass.length) {
    console.log(`\nSecond pass (strict): ${secondPass.join(', ')}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
