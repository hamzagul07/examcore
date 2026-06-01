#!/usr/bin/env node
/**
 * Pre-extract full mark schemes for high-traffic papers into mark_schemes.
 *
 * Run: pnpm prewarm-schemes
 *      pnpm prewarm-schemes --dry-run   (first 3 uncached papers only)
 */

import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import { jsonrepair } from 'jsonrepair'
import {
  readFileSync,
  writeFileSync,
  existsSync,
} from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const LOG_PATH = join(__dirname, 'prewarm-log.json')

const DRY_RUN = process.argv.includes('--dry-run')
const PACE_MS = 30_000

const SUBJECT_NAMES = {
  '9709': 'Mathematics',
  '9702': 'Physics',
  '9701': 'Chemistry',
  '9700': 'Biology',
  '9708': 'Economics',
}

const SESSIONS = ['s24', 'w24', 's25']

const PAPER_SETS = [
  {
    subject: '9709',
    components: [
      '11', '12', '13', '21', '22', '31', '32', '33', '41', '42', '51', '52',
      '61', '62',
    ],
  },
  {
    subject: '9702',
    components: ['11', '12', '13', '22', '23', '41', '42'],
  },
  {
    subject: '9701',
    components: ['11', '12', '13', '22', '23', '41', '42'],
  },
  {
    subject: '9700',
    components: ['11', '12', '13', '22', '23', '41', '42'],
  },
  {
    subject: '9708',
    components: ['11', '12', '13', '21', '22', '31', '32'],
  },
]

const GEMINI_RETRYABLE = [429, 500, 503]
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

loadEnvFile('.env.local')

function sessionCodeToName(code) {
  const m = code.toLowerCase().match(/^([smw])(\d{2})$/)
  if (!m) return null
  const year = 2000 + parseInt(m[2], 10)
  const season =
    m[1] === 's'
      ? 'May/June'
      : m[1] === 'w'
        ? 'October/November'
        : 'February/March'
  return `${season} ${year}`
}

function resolveMarkingType(subjectCode) {
  if (subjectCode === '9708') return 'mixed'
  return 'point_based'
}

function buildExtractionPrompt(markingType) {
  return `You are extracting Cambridge International A-Level mark schemes from official PDFs. You have been given:
- The QUESTION PAPER (first PDF) — contains the actual problem statements
- The MARK SCHEME (second PDF) — contains the marking criteria

For every question and sub-part in this paper (including 1, 2(a), 2(b), 3(a)(i), etc.), cross-reference both PDFs to extract:

1. question_number — exactly as printed
2. question_text — the full problem statement from the question paper
3. total_marks — sum of marks for this question/sub-part
4. marking_type — one of: mcq, point_based, level_of_response, mixed
5. mark_scheme — structured JSON appropriate to the marking type

Be thorough. Extract EVERY question, every sub-part. Don't skip any.

Output ONLY this JSON (no markdown):
{
  "paper_marking_type": "${markingType}",
  "questions": [ ... ]
}`
}

function extractJSON(text) {
  const jsonMatch =
    text.match(/```json\n([\s\S]*?)\n```/) ||
    text.match(/```\n([\s\S]*?)\n```/) ||
    text.match(/{[\s\S]*}/)
  const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text
  try {
    return JSON.parse(jsonString)
  } catch {
    return JSON.parse(jsonrepair(jsonString))
  }
}

function validateQuestion(q, paperMarkingType) {
  if (typeof q.question_number !== 'string' || !q.question_number.trim()) {
    return false
  }
  const totalMarks =
    typeof q.total_marks === 'number' ? q.total_marks : Number(q.total_marks)
  if (!Number.isFinite(totalMarks) || totalMarks <= 0) return false
  const ms = q.mark_scheme
  if (!ms || typeof ms !== 'object') return false
  const qType = ms.type || paperMarkingType
  if (qType === 'mcq') {
    return !!(ms.answer_key && Object.keys(ms.answer_key).length > 0)
  }
  if (qType === 'level_of_response') {
    return Array.isArray(ms.bands) && ms.bands.length > 0
  }
  if (qType === 'point_based') {
    return Array.isArray(ms.marks) && ms.marks.length > 0
  }
  return true
}

function questionMarkingType(q, paperMarkingType) {
  const ms = q.mark_scheme
  const qStyle = ms?.type ?? q.marking_type
  if (
    qStyle === 'mcq' ||
    qStyle === 'point_based' ||
    qStyle === 'level_of_response' ||
    qStyle === 'mixed'
  ) {
    return qStyle
  }
  return paperMarkingType === 'mixed' ? 'point_based' : paperMarkingType
}

async function withGeminiRetry(fn, label = 'gemini') {
  const maxRetries = 4
  const baseDelayMs = 1000
  let lastErr
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const status = err?.status ?? err?.error?.code
      const message = err?.message ?? ''
      const retryable =
        (status !== undefined && GEMINI_RETRYABLE.includes(status)) ||
        OVERLOAD_PATTERN.test(message)
      if (!retryable || attempt === maxRetries) break
      const delay =
        Math.min(baseDelayMs * 2 ** attempt, 15000) + Math.random() * 500
      console.warn(
        `[${label}] retry ${attempt + 1}/${maxRetries}, wait ${Math.round(delay)}ms`
      )
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastErr
}

function loadLog() {
  if (!existsSync(LOG_PATH)) {
    return { completed: [], failed: {}, skipped_cached: [] }
  }
  try {
    return JSON.parse(readFileSync(LOG_PATH, 'utf8'))
  } catch {
    return { completed: [], failed: {}, skipped_cached: [] }
  }
}

function saveLog(log) {
  writeFileSync(LOG_PATH, JSON.stringify(log, null, 2))
}

function paperKey(paperCode, paperSession) {
  return `${paperCode}|${paperSession}`
}

function buildPaperList() {
  const list = []
  for (const { subject, components } of PAPER_SETS) {
    for (const session of SESSIONS) {
      const paperSession = sessionCodeToName(session)
      if (!paperSession) continue
      for (const component of components) {
        list.push({
          subject,
          component,
          session,
          paperCode: `${subject}/${component}`,
          paperSession,
        })
      }
    }
  }
  return list
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

async function isPaperCached(paperCode, paperSession) {
  const { count, error } = await supabase
    .from('mark_schemes')
    .select('*', { count: 'exact', head: true })
    .eq('paper_code', paperCode)
    .eq('paper_session', paperSession)
  if (error) {
    console.error('Cache check error:', error.message)
    return false
  }
  return (count ?? 0) > 0
}

async function extractFullPaper(paper) {
  const { paperCode, paperSession, subject, session, component } = paper
  const cachePath = join(ROOT, 'lib', 'subject-papers-cache.json')
  let storagePrefix = 'cambridge'
  if (existsSync(cachePath)) {
    const cache = JSON.parse(readFileSync(cachePath, 'utf8'))
    storagePrefix = cache[subject]?.storagePrefix ?? 'cambridge'
  }
  const qpPath = `${storagePrefix}/${subject}/${session}/qp_${component}.pdf`
  const msPath = `${storagePrefix}/${subject}/${session}/ms_${component}.pdf`

  const [qpRes, msRes] = await Promise.all([
    supabase.storage.from('paper-pdfs').download(qpPath),
    supabase.storage.from('paper-pdfs').download(msPath),
  ])

  if (qpRes.error || !qpRes.data || msRes.error || !msRes.data) {
    throw new Error(
      `PDF missing: ${qpRes.error?.message || msRes.error?.message || 'download failed'}`
    )
  }

  const qpBase64 = Buffer.from(await qpRes.data.arrayBuffer()).toString('base64')
  const msBase64 = Buffer.from(await msRes.data.arrayBuffer()).toString('base64')
  const markingType = resolveMarkingType(subject)
  const prompt = buildExtractionPrompt(markingType)

  const extractionText = await withGeminiRetry(
    async () => {
      const res = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'application/pdf', data: qpBase64 } },
              { inlineData: { mimeType: 'application/pdf', data: msBase64 } },
              { text: prompt },
            ],
          },
        ],
      })
      return res.text || ''
    },
    'pdf-extraction'
  )

  const parsed = extractJSON(extractionText)
  if (!parsed?.questions?.length) {
    throw new Error('Extraction returned no questions')
  }

  const subjectName = SUBJECT_NAMES[subject] || 'Unknown'
  const rows = []
  for (const q of parsed.questions) {
    if (!validateQuestion(q, markingType)) continue
    rows.push({
      paper_code: paperCode,
      paper_session: paperSession,
      question_number: String(q.question_number).trim(),
      question_text: typeof q.question_text === 'string' ? q.question_text : '',
      total_marks:
        typeof q.total_marks === 'number' ? q.total_marks : Number(q.total_marks),
      mark_scheme: q.mark_scheme,
      marking_type: questionMarkingType(q, markingType),
      subject: subjectName,
      board: 'Cambridge International',
    })
  }

  if (rows.length === 0) {
    throw new Error('All extracted questions failed validation')
  }

  const { error } = await supabase
    .from('mark_schemes')
    .upsert(rows, { onConflict: 'paper_code,paper_session,question_number' })

  if (error) throw new Error(`Upsert failed: ${error.message}`)
  return rows.length
}

async function main() {
  if (!process.env.GEMINI_API_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('Missing GEMINI_API_KEY or Supabase env in .env.local')
    process.exit(1)
  }

  const log = loadLog()
  const papers = buildPaperList()
  let warmed = 0
  let cached = 0
  let failed = 0
  let dryRunRemaining = DRY_RUN ? 3 : Infinity

  console.log(
    DRY_RUN
      ? `Dry run: up to ${dryRunRemaining} extractions`
      : `Pre-warming ${papers.length} paper slots…`
  )

  for (const paper of papers) {
    if (DRY_RUN && dryRunRemaining <= 0) break

    const key = paperKey(paper.paperCode, paper.paperSession)
    if (log.completed.includes(key)) {
      continue
    }

    if (await isPaperCached(paper.paperCode, paper.paperSession)) {
      cached++
      if (!log.skipped_cached.includes(key)) {
        log.skipped_cached.push(key)
        saveLog(log)
      }
      console.log(`[cached] ${key}`)
      continue
    }

    if (DRY_RUN && dryRunRemaining <= 0) break

    console.log(`[extract] ${key}…`)
    try {
      const count = await extractFullPaper(paper)
      log.completed.push(key)
      if (log.failed[key]) delete log.failed[key]
      saveLog(log)
      warmed++
      dryRunRemaining--
      console.log(`[ok] ${key} — ${count} questions`)
    } catch (err) {
      failed++
      const msg = err instanceof Error ? err.message : String(err)
      log.failed[key] = msg
      saveLog(log)
      console.error(`[fail] ${key}: ${msg}`)
    }

    if (DRY_RUN && dryRunRemaining <= 0) break
    if (warmed > 0 || failed > 0) {
      console.log(`Waiting ${PACE_MS / 1000}s before next paper…`)
      await new Promise((r) => setTimeout(r, PACE_MS))
    }
  }

  console.log('\n--- Summary ---')
  console.log(`Pre-warmed: ${warmed}`)
  console.log(`Already cached: ${cached}`)
  console.log(`Failed: ${failed}`)
  console.log(`Log: ${LOG_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
