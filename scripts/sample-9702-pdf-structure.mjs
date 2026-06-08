#!/usr/bin/env node
/**
 * Sample 3 PDF types from s24 for Phase 0 structure audit.
 * Run: node scripts/sample-9702-pdf-structure.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import { GEMINI_FLASH_MODEL } from '../lib/ai/gemini-models.mjs'
import { readFileSync, existsSync } from 'fs'
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

const SAMPLES = [
  {
    id: 'paper1-mcq',
    path: 'cambridge/9702/s24/qp_12.pdf',
    label: 'Paper 1 MCQ (qp_12)',
    paperType: 'multiple-choice',
  },
  {
    id: 'paper4-structured',
    path: 'cambridge/9702/s24/qp_42.pdf',
    label: 'Paper 4 Structured (qp_42)',
    paperType: 'structured A-Level',
  },
  {
    id: 'paper3-practical',
    path: 'cambridge/9702/s24/qp_32.pdf',
    label: 'Paper 3 Practical (qp_32)',
    paperType: 'practical',
  },
]

const INSPECT_PROMPT = `You are auditing Cambridge International A-Level Physics 9702 question paper PDFs for an extraction pipeline.

Analyze this PDF and return ONLY valid JSON:

{
  "page_count_estimate": number,
  "question_numbering_style": "description of how questions are numbered",
  "sample_question_numbers": ["1", "2(a)", "2(a)(i)", ...],
  "max_nesting_depth": number,
  "mark_annotation_style": "how marks are shown e.g. [3] at end of line",
  "diagram_density": "low" | "medium" | "high",
  "diagram_count_estimate": number,
  "math_notation_density": "low" | "medium" | "high",
  "has_tables": boolean,
  "has_mcq_options": boolean,
  "mcq_option_style": "A B C D columns" | "none",
  "figure_reference_style": "e.g. Fig. 4.1 shows...",
  "notable_layout_challenges": ["list of extraction challenges"],
  "sample_question_excerpt": "verbatim 3-5 lines from one representative question",
  "extraction_notes": "brief notes for Mathpix + question splitter design"
}`

async function inspectPdf(sample) {
  const { data, error } = await supabase.storage
    .from('paper-pdfs')
    .download(sample.path)
  if (error || !data) {
    return { ...sample, error: error?.message || 'download failed' }
  }

  const bytes = data.size ?? (await data.arrayBuffer()).byteLength
  const base64 = Buffer.from(await data.arrayBuffer()).toString('base64')

  try {
    const response = await genAI.models.generateContent({
      model: GEMINI_FLASH_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'application/pdf', data: base64 } },
            {
              text: `${INSPECT_PROMPT}\n\nPaper type context: ${sample.label} (${sample.paperType})`,
            },
          ],
        },
      ],
    })
    const text = response.text || ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return { ...sample, bytes, error: 'no json', raw: text.slice(0, 400) }
    const parsed = JSON.parse(match[0])
    return { ...sample, bytes, inspection: parsed }
  } catch (err) {
    return {
      ...sample,
      bytes,
      error: err instanceof Error ? err.message : 'api error',
    }
  }
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY required')
    process.exit(1)
  }

  const results = []
  for (const sample of SAMPLES) {
    console.error(`Inspecting ${sample.path}...`)
    results.push(await inspectPdf(sample))
    await new Promise((r) => setTimeout(r, 2000))
  }

  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), samples: results }, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
