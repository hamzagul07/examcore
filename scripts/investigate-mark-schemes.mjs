#!/usr/bin/env node
/**
 * Sample mark scheme PDFs from storage and classify marking structure via Gemini.
 * Output: lib/marking/investigation-report.json
 *
 * Run: node scripts/investigate-mark-schemes.mjs
 *      node scripts/investigate-mark-schemes.mjs --subject 9702
 */

import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import { GEMINI_TEXT_MODEL } from '../lib/ai/gemini-models.mjs'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

const SUBJECTS = [
  '9084', '9231', '9488', '9489', '9607', '9609', '9618', '9699',
  '9700', '9701', '9702', '9706', '9708', '9709', '9990',
]

/** Pick diverse components per subject from cache */
function pickSamples(cache) {
  const samples = []
  for (const code of SUBJECTS) {
    const subj = cache[code]
    if (!subj?.papers?.length) continue
    const session = subj.sessions.includes('s24') ? 's24' : subj.sessions[0]
    const comps = subj.papers.flatMap((p) => p.components)
    const picks = []
    if (comps[0]) picks.push(comps[0])
    const mid = comps[Math.floor(comps.length / 2)]
    if (mid && mid !== comps[0]) picks.push(mid)
    const last = comps[comps.length - 1]
    if (last && !picks.includes(last)) picks.push(last)
    for (const component of picks.slice(0, 3)) {
      // Skip legacy/non-storage codes like 9607 "02", "04"
      if (component.length === 2 && component.startsWith('0')) continue
      samples.push({ code, session, component })
    }
  }
  return samples
}

const CLASSIFY_PROMPT = `You are analyzing a Cambridge International A-Level MARK SCHEME PDF.

Read the PDF and classify how this paper is marked. Return ONLY valid JSON:

{
  "marking_type": "mcq" | "point_based" | "level_of_response" | "mixed",
  "confidence": "high" | "medium" | "low",
  "paper_description": "brief description of paper type",
  "example_snippet": "verbatim 2-4 lines from the mark scheme showing the marking style",
  "question_styles": [
    {
      "question_number": "1 or 2(a) etc",
      "style": "mcq" | "point_based" | "level_of_response",
      "notes": "brief"
    }
  ],
  "has_mcq_key": true/false,
  "has_band_descriptors": true/false,
  "has_b_m_a_marks": true/false,
  "notes": "anything unusual"
}

Rules:
- mcq: answer key only (A, B, C, D per question)
- point_based: discrete marks (B1, M1, A1, "award 1 mark for...", bullet criteria)
- level_of_response: band descriptors with mark ranges (Level 1-4, 13-16 marks)
- mixed: paper contains multiple styles across questions/sections
- example_snippet must be copied from the actual PDF text you see`

async function classifyPdf(msPath, retries = 3) {
  const { data, error } = await supabase.storage.from('paper-pdfs').download(msPath)
  if (error || !data) return { error: error?.message || 'download failed' }

  const base64 = Buffer.from(await data.arrayBuffer()).toString('base64')
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await genAI.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'application/pdf', data: base64 } },
              { text: CLASSIFY_PROMPT },
            ],
          },
        ],
      })
      const text = response.text || ''
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) return { error: 'no json', raw: text.slice(0, 500) }
      try {
        return JSON.parse(match[0])
      } catch {
        return { error: 'parse failed', raw: text.slice(0, 500) }
      }
    } catch (err) {
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)))
        continue
      }
      return { error: err instanceof Error ? err.message : 'api error' }
    }
  }
  return { error: 'exhausted retries' }
}

async function main() {
  const filterSubject = process.argv.find((a) => a.startsWith('--subject='))?.split('=')[1]
    || (process.argv.includes('--subject') ? process.argv[process.argv.indexOf('--subject') + 1] : null)

  const cache = JSON.parse(
    readFileSync(join(ROOT, 'lib/subject-papers-cache.json'), 'utf8')
  )
  let samples = pickSamples(cache)
  if (filterSubject) {
    samples = samples.filter((s) => s.code === filterSubject)
  }

  console.log(`Investigating ${samples.length} mark scheme samples...`)
  const report = { generated_at: new Date().toISOString(), samples: [] }

  const outPath = join(ROOT, 'lib/marking/investigation-report.json')
  let existing = { samples: [] }
  if (existsSync(outPath)) {
    try {
      existing = JSON.parse(readFileSync(outPath, 'utf8'))
    } catch {
      /* ignore */
    }
  }
  const done = new Set(
    (existing.samples || []).map((s) => `${s.code}/${s.component}`)
  )
  const pending = samples.filter((s) => !done.has(`${s.code}/${s.component}`))
  report.samples = [...(existing.samples || [])]

  for (const { code, session, component } of pending) {
    const cachePath = join(ROOT, 'lib', 'subject-papers-cache.json')
    let storagePrefix = 'cambridge'
    if (existsSync(cachePath)) {
      const cache = JSON.parse(readFileSync(cachePath, 'utf8'))
      storagePrefix = cache[code]?.storagePrefix ?? 'cambridge'
    }
    const msPath = `${storagePrefix}/${code}/${session}/ms_${component}.pdf`
    process.stdout.write(`${msPath} ... `)
    const result = await classifyPdf(msPath)
    report.samples.push({ code, session, component, path: msPath, ...result })
    writeFileSync(outPath, JSON.stringify(report, null, 2))
    console.log(result.error || result.marking_type || 'done')
    // gentle rate limit
    await new Promise((r) => setTimeout(r, 1500))
  }

  writeFileSync(outPath, JSON.stringify(report, null, 2))
  console.log(`\nWrote ${outPath} (${report.samples.length} samples)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
