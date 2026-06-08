#!/usr/bin/env node
/**
 * Interim PDF structure analysis when Mathpix keys unavailable.
 * Production path uses mathpix-sample-papers.mjs only.
 */
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MODEL = 'gemini-2.5-pro'

const SAMPLES = [
  { id: 'p3-practical', path: 'cambridge/9702/s24/qp_32.pdf', label: 'Paper 3 Practical (qp_32)' },
  { id: 'p4-structured', path: 'cambridge/9702/s24/qp_42.pdf', label: 'Paper 4 Structured (qp_42)' },
]

const PROMPT = `Analyze this Cambridge 9702 Physics question paper PDF. Return ONLY valid JSON:
{
  "page_count_estimate": number,
  "max_nesting_depth": number,
  "nesting_description": "how sub-parts are numbered",
  "sub_part_formats": { "lowercase_letters": boolean, "roman_numerals": boolean, "examples": string[] },
  "mark_annotation_formats": { "bracket": string[], "paren_marks": string[], "other": string[] },
  "table_density": "none" | "low" | "medium" | "high",
  "table_descriptions": string[],
  "diagram_density": "low" | "medium" | "high",
  "diagrams_per_page_estimate": number,
  "differences_from_p1_mcq": string[],
  "sample_question_numbers": string[],
  "sample_excerpts": string[],
  "splitter_notes": string[]
}`

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

loadEnv()

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  const outDir = join(ROOT, 'scripts', 'mathpix-samples')
  mkdirSync(outDir, { recursive: true })
  const results = []

  for (const s of SAMPLES) {
    const { data, error } = await supabase.storage.from('paper-pdfs').download(s.path)
    if (error || !data) throw new Error(error?.message || 'download failed')
    const b64 = Buffer.from(await data.arrayBuffer()).toString('base64')
    const res = await genAI.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'application/pdf', data: b64 } }, { text: PROMPT + '\n\n' + s.label }] }],
    })
    const text = res.text || ''
    const m = text.match(/\{[\s\S]*\}/)
    const parsed = m ? JSON.parse(m[0]) : { raw: text.slice(0, 500) }
    results.push({ ...s, bytes: (await data.arrayBuffer()).byteLength, analysis: parsed, source: 'gemini-2.5-pro-interim' })
    await new Promise((r) => setTimeout(r, 3000))
  }

  const out = join(outDir, 'gemini-interim-analysis.json')
  writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2))
  console.log('Wrote', out)
}

main().catch((e) => { console.error(e); process.exit(1) })
