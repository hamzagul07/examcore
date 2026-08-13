#!/usr/bin/env node
/**
 * Pre-extract full mark schemes for high-traffic papers into mark_schemes.
 *
 * Run: pnpm prewarm-schemes
 *      pnpm prewarm-schemes --dry-run      (list targets; writes nothing)
 *      pnpm prewarm-schemes --limit=3      (warm 3 papers for real)
 *      pnpm prewarm-schemes --from-demand  (target what students actually mark)
 *
 * A cached scheme is the difference between a mark that looks one up and a mark
 * that spends a Gemini Pro call deriving one — the most expensive stage there
 * is. `--from-demand` reads mark_runs and warms the subjects being marked, in
 * volume order, instead of a list that was written once and has since drifted
 * behind what students study.
 */

import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import { GEMINI_FLASH_MODEL } from '../lib/ai/gemini-models.mjs'
import { getComponentMarkingType } from '../lib/marking/component-types.ts'
import { extractJSON } from '../lib/marking/json.ts'
import { fetchAllRows } from '../lib/supabase/fetch-all.ts'
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

/**
 * `--dry-run` lists what would be warmed and writes nothing.
 *
 * It used to extract three papers for real — spending Gemini and writing to
 * mark_schemes — which is the opposite of what the flag says and of what anyone
 * reaches for it to find out. The "do a few for real" behaviour still exists,
 * under a name that admits it.
 */
const DRY_RUN = process.argv.includes('--dry-run')
const LIMIT_ARG = process.argv.find((a) => a.startsWith('--limit='))
const WARM_LIMIT = LIMIT_ARG ? Math.max(1, Number(LIMIT_ARG.split('=')[1])) : Infinity
// Seconds between papers; overridable with --pace=10 (min 2s).
const PACE_ARG = process.argv.find((a) => a.startsWith('--pace='))
const PACE_MS = PACE_ARG ? Math.max(2000, Number(PACE_ARG.split('=')[1]) * 1000) : 30_000

const SUBJECT_NAMES = {
  '9709': 'Mathematics',
  '9702': 'Physics',
  '9701': 'Chemistry',
  '9700': 'Biology',
  '9708': 'Economics',
}

// Default sessions, overridable with --sessions=s24,w24 to scope a run.
const SESSION_ARG = process.argv.find((a) => a.startsWith('--sessions='))
const SESSIONS = SESSION_ARG
  ? SESSION_ARG.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean)
  : ['s24', 'w24', 's25', 'w25', 's26']

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

/**
 * Components to try for a subject nobody listed explicitly. Deliberately the
 * common Cambridge spread rather than a guess per subject: a component that
 * does not exist simply finds no PDF and is skipped, which costs a lookup,
 * while a missing one costs every student of that paper a live scheme
 * derivation.
 */
const DEFAULT_COMPONENTS = ['11', '12', '13', '21', '22', '31', '32', '41', '42']

/**
 * Prewarm what students actually mark, rather than what someone listed once.
 *
 * The hardcoded set above covers five subjects and, until now, sessions ending
 * at s25 — while `deriving_scheme` is the single most expensive stage of a mark
 * and runs precisely when no official scheme was found. Marking demand has
 * since included 9706, 9609, 9084 and 9488, none of which could ever be warmed
 * because they were not on the list.
 */
async function demandPaperSets() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  // Paged: an unpaged select stops at PostgREST's 1,000-row cap, which would
  // quietly narrow "what students actually mark" to the oldest thousand runs.
  const rows = await fetchAllRows(db, 'mark_runs', 'subject_code')

  const counts = new Map()
  for (const row of rows) {
    const code = String(row.subject_code)
    // Cambridge syllabus codes only — IB subjects have no PDF mark schemes to
    // extract, which is why their marking derives instead.
    if (!/^\d{4}$/.test(code)) continue
    counts.set(code, (counts.get(code) ?? 0) + 1)
  }

  const listed = new Map(PAPER_SETS.map((p) => [p.subject, p]))
  const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const sets = []
  for (const [subject, marks] of ordered) {
    sets.push(listed.get(subject) ?? { subject, components: DEFAULT_COMPONENTS })
    console.error(`[prewarm] demand: ${subject} — ${marks} mark(s)${listed.has(subject) ? '' : ' (not previously listed)'}`)
  }
  // Keep listed-but-unmarked subjects last: still worth warming, just after the
  // ones costing students time today.
  for (const p of PAPER_SETS) if (!counts.has(p.subject)) sets.push(p)
  return sets
}

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

/**
 * Ask the app, not a second opinion kept here.
 *
 * This used to hardcode "9708 is mixed, everything else is point_based", which
 * disagreed with `component-types.ts` on 56 of 117 component slots — every
 * science Paper 1 is multiple choice and was being extracted with a
 * point-based prompt. Two sources of truth for the same question is how one of
 * them silently goes stale, and the divergence is what exposed a real error in
 * the other: Economics Paper 3 was declared level_of_response and is MCQ.
 */
function resolveMarkingType(subjectCode, component) {
  return getComponentMarkingType(subjectCode, component ?? '')
}

function buildExtractionPrompt(markingType) {
  return `You are extracting a Cambridge International A-Level mark scheme from two official PDFs:
- PDF 1 = the QUESTION PAPER (problem statements)
- PDF 2 = the MARK SCHEME (marking criteria)

For EVERY question and sub-part (1, 2(a), 2(b), 3(a)(i), …), cross-reference both PDFs and output an object with EXACTLY these fields:
- "question_number": string, exactly as printed (e.g. "2(a)", "3(b)(i)")
- "question_text": string — the full problem statement from the question paper
- "total_marks": a number greater than 0
- "marking_type": one of "point_based" | "level_of_response" | "mcq"
- "mark_scheme": an object whose shape MUST match the marking_type EXACTLY:

  point_based →
  {"type":"point_based","marks":[{"id":1,"type":"M1","value":1,"description":"what earns this mark","ecf_from":null,"acceptable_forms":null}, …]}
  • one entry per awardable mark point; "type" is the mark code (M1, A1, B1, DM1, …); "value" is the marks for that point; the "marks" array MUST be non-empty.

  level_of_response →
  {"type":"level_of_response","bands":[{"level":4,"marks_min":9,"marks_max":10,"descriptor":"the level descriptor"}, …]}
  • one entry per band/level; "bands" MUST be non-empty.

  mcq →
  {"type":"mcq","answer_key":{"1":"B","2":"C", …}}

Most ${markingType === 'mixed' ? 'Economics ' : ''}questions are ${markingType === 'mixed' ? 'point_based (data response / short answers) OR level_of_response (essays) — choose per question from what the mark scheme shows' : markingType}. Be thorough: extract EVERY question and sub-part, skip none.

Output ONLY this JSON, no markdown, no commentary:
{"paper_marking_type":"${markingType}","questions":[ … ]}`
}

// extractJSON lives in lib/marking/json.ts. A local copy used to sit here, and
// it is the reason 9700/42 was reported three times as "all extracted questions
// failed validation": the shared version learned to repair the invalid JSON
// escapes that LaTeX in a mark scheme produces, and this copy never did, so the
// fix reached live marking and not the cache that feeds it. Third piece of
// duplicated logic found in this one script, after the marking-type map and the
// row-cap assumption.

/**
 * Accept the shape the model actually returns, not only the one it was asked for.
 *
 * The prompt specifies `{"type":"point_based","marks":[…]}` and the model
 * sometimes emits the bare array instead — `"mark_scheme": [ {id:1,…} ]`. The
 * content is right and complete; only the wrapper is missing. Validation then
 * looked for `ms.marks`, found nothing, and rejected every question in the
 * paper, which surfaced as "all extracted questions failed validation" on a
 * perfectly good 40-question extraction.
 *
 * Wrapping is lossless: the array IS the list the wrapper would have held.
 * Rejecting a paper over a missing pair of braces is not.
 */
function normaliseMarkScheme(ms, markingType) {
  if (!Array.isArray(ms)) return ms
  if (markingType === 'level_of_response') return { type: markingType, bands: ms }
  return { type: markingType === 'mixed' ? 'point_based' : markingType, marks: ms }
}

function validateQuestion(q, paperMarkingType) {
  if (typeof q.question_number !== 'string' || !q.question_number.trim()) {
    return false
  }
  const totalMarks =
    typeof q.total_marks === 'number' ? q.total_marks : Number(q.total_marks)
  if (!Number.isFinite(totalMarks) || totalMarks <= 0) return false
  const ms = normaliseMarkScheme(q.mark_scheme, paperMarkingType)
  if (!ms || typeof ms !== 'object' || Array.isArray(ms)) return false
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

// Optional: scope a run to specific subjects with --subjects=9708,9702
const SUBJECT_ARG = process.argv.find((a) => a.startsWith('--subjects='))
const ONLY_SUBJECTS = SUBJECT_ARG
  ? new Set(SUBJECT_ARG.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean))
  : null

const FROM_DEMAND = process.argv.includes('--from-demand')

function buildPaperList(paperSets = PAPER_SETS) {
  const list = []
  for (const { subject, components } of paperSets) {
    if (ONLY_SUBJECTS && !ONLY_SUBJECTS.has(subject)) continue
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
  const markingType = resolveMarkingType(subject, component)
  const prompt = buildExtractionPrompt(markingType)

  const extractionText = await withGeminiRetry(
    async () => {
      const res = await genAI.models.generateContent({
        model: GEMINI_FLASH_MODEL,
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
        // Deterministic, untruncated, clean JSON.
        //
        // The ceiling has to cover thinking as well as output: a 40-question
        // paper measured 16,024 output tokens against 7,262 of thinking, and
        // both count here. At 32,768 a paper that thought harder than average
        // ran out mid-JSON, and the truncation surfaced downstream as "all
        // extracted questions failed validation" — which sent three separate
        // investigations at the validator instead of at the token budget.
        config: {
          temperature: 0,
          maxOutputTokens: 65536,
          responseMimeType: 'application/json',
        },
      })
      // Say truncated when truncated. Everything downstream reads a cut-off
      // response as malformed content, which is true but useless.
      const finish = res.candidates?.[0]?.finishReason
      if (finish === 'MAX_TOKENS') {
        const usage = res.usageMetadata ?? {}
        throw new Error(
          `Response truncated at the token ceiling (output ${usage.candidatesTokenCount ?? '?'}, thoughts ${usage.thoughtsTokenCount ?? '?'})`
        )
      }
      return res.text || ''
    },
    'pdf-extraction'
  )

  if (process.env.PREWARM_DUMP) {
    writeFileSync(process.env.PREWARM_DUMP, extractionText)
    console.error(`[debug] raw response -> ${process.env.PREWARM_DUMP} (${extractionText.length} chars)`)
  }
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
      mark_scheme: normaliseMarkScheme(q.mark_scheme, markingType),
      marking_type: questionMarkingType(q, markingType),
      subject: subjectName,
      board: 'Cambridge International',
    })
  }

  if (rows.length === 0) {
    // Say WHY, not just that. This message sent three separate investigations
    // at the validator, the JSON escapes and the token ceiling in turn, while
    // the actual reason was never printed.
    const seen = parsed.questions.length
    const sample = parsed.questions.slice(0, 3).map((q) => {
      const ms = q?.mark_scheme
      return {
        n: q?.question_number,
        total: q?.total_marks,
        msKeys: ms && typeof ms === 'object' ? Object.keys(ms) : typeof ms,
        msType: ms?.type,
        paperType: markingType,
      }
    })
    throw new Error(
      `All ${seen} extracted questions failed validation — ${JSON.stringify(sample)}`
    )
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
  const paperSets = FROM_DEMAND ? await demandPaperSets() : PAPER_SETS
  const papers = buildPaperList(paperSets)
  let warmed = 0
  let cached = 0
  let failed = 0
  // A paper whose PDFs are not in storage is not a failure — it is a session
  // that has not been synced yet, and counting it alongside real extraction
  // errors makes a healthy run look broken. Adding the current session to the
  // defaults guarantees a batch of these until those papers land.
  let missing = 0
  let wouldWarm = 0
  let warmRemaining = WARM_LIMIT

  console.log(
    DRY_RUN
      ? `Dry run — listing ${papers.length} paper slot(s). Nothing will be written.`
      : `Pre-warming ${papers.length} paper slots${WARM_LIMIT === Infinity ? '' : ` (limit ${WARM_LIMIT})`}…`
  )

  for (const paper of papers) {
    if (warmRemaining <= 0) break

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

    if (warmRemaining <= 0) break

    if (DRY_RUN) {
      wouldWarm++
      console.log(`[would warm] ${key}`)
      continue
    }

    console.log(`[extract] ${key}…`)
    try {
      const count = await extractFullPaper(paper)
      log.completed.push(key)
      if (log.failed[key]) delete log.failed[key]
      saveLog(log)
      warmed++
      warmRemaining--
      console.log(`[ok] ${key} — ${count} questions`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (/PDF missing|Object not found/i.test(msg)) {
        missing++
        console.log(`[not-synced] ${key}`)
      } else {
        failed++
        log.failed[key] = msg
        saveLog(log)
        console.error(`[fail] ${key}: ${msg}`)
      }
    }

    if (warmRemaining <= 0) break
    // Nothing was asked of Gemini for an unsynced paper, so there is nothing to
    // pace against — waiting there just makes a no-op run take an hour.
    if (warmed > 0 || failed > 0) {
      console.log(`Waiting ${PACE_MS / 1000}s before next paper…`)
      await new Promise((r) => setTimeout(r, PACE_MS))
    }
  }

  console.log('\n--- Summary ---')
  // A dry run warms nothing by definition, so reporting "Pre-warmed: 0" reads
  // as "found nothing to do" when the answer is the opposite.
  console.log(DRY_RUN ? `Would warm: ${wouldWarm}` : `Pre-warmed: ${warmed}`)
  console.log(`Already cached: ${cached}`)
  console.log(`Not synced (no PDF in storage): ${missing}`)
  console.log(`Failed: ${failed}`)
  console.log(`Log: ${LOG_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
