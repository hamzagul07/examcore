#!/usr/bin/env node
/**
 * Phase 1 grain gate: compare PDF specification bullets vs JSON leaves for one parent.
 */

import { GoogleGenAI } from '@google/genai'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const CHECKS = [
  {
    code: '9700',
    parentCode: '1',
    parentName: 'Cell structure',
    pdfTopic: 'Topic 1 Cell structure',
  },
  {
    code: '9702',
    parentCode: '2',
    parentName: 'Kinematics',
    pdfTopic: 'Topic 2 Kinematics',
  },
  {
    code: '9489',
    parentCode: 'P2_EUR_2026',
    parentName: 'European option Paper 2 Outline study',
    pdfTopic:
      'Paper 2 European option: Modern Europe, 1750–1921 — list each outline study topic',
  },
]

function loadEnv() {
  const path = join(ROOT, '.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

async function main() {
  loadEnv()
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY required')
    process.exit(1)
  }

  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  const results = []

  for (const check of CHECKS) {
    const pdfPath = join(ROOT, 'syllabi-source', `${check.code}.pdf`)
    const jsonPath = join(ROOT, 'lib', 'syllabi', `${check.code}.json`)
    const data = JSON.parse(readFileSync(jsonPath, 'utf8'))
    const jsonLeaves = data.topics.filter((t) => t.parent === check.parentCode)

    const base64 = readFileSync(pdfPath).toString('base64')
    const prompt = `You are verifying syllabus extraction grain for Cambridge ${check.code}.

In this PDF, find ${check.pdfTopic}.

List EVERY assessable specification point Cambridge prints under that section:
- For sciences: each numbered sub-topic and each bullet learning outcome (e.g. 1.1, 1.2, and bullets under them)
- For History: each distinct outline study / content area listed under that paper option

Return ONLY JSON:
{
  "parentTopic": "${check.parentName}",
  "pdfBulletCount": <number of distinct assessable points>,
  "pdfPoints": ["brief label 1", "brief label 2", ...]
}

Count bullets at the finest level Cambridge uses for teaching/assessment — not chapter titles alone.`

    const response = await genAI.models.generateContent({
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
    })

    const text = response.text || ''
    const match = text.match(/\{[\s\S]*\}/)
    let pdfData = { pdfBulletCount: 0, pdfPoints: [] }
    if (match) {
      try {
        pdfData = JSON.parse(match[0])
      } catch {
        /* ignore */
      }
    }

    const pdfCount = pdfData.pdfBulletCount || pdfData.pdfPoints?.length || 0
    const jsonCount = jsonLeaves.length
    let verdict = 'pass'
    if (jsonCount < pdfCount * 0.6) verdict = 'coarse'
    else if (jsonCount > pdfCount * 1.5) verdict = 'fine'

    results.push({
      ...check,
      pdfCount,
      jsonCount,
      verdict,
      jsonLeaves: jsonLeaves.map((l) => `${l.code}: ${l.name}`),
      pdfPoints: (pdfData.pdfPoints || []).slice(0, 12),
    })

    console.log(`\n=== ${check.code} — ${check.parentName} ===`)
    console.log(`PDF bullets/points: ${pdfCount}`)
    console.log(`JSON leaves: ${jsonCount}`)
    console.log(`Verdict: ${verdict}`)
    if (pdfData.pdfPoints?.length) {
      console.log('PDF sample:', pdfData.pdfPoints.slice(0, 6).join(' | '))
    }
    console.log('JSON leaves:', jsonLeaves.map((l) => l.code).join(', '))
  }

  writeFileSync(
    join(ROOT, 'lib', 'syllabi', 'GRAIN_VERIFICATION.json'),
    JSON.stringify({ verifiedAt: new Date().toISOString(), results }, null, 2)
  )
  console.log('\nWrote lib/syllabi/GRAIN_VERIFICATION.json')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
