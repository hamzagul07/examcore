#!/usr/bin/env node
/**
 * School pipeline: PMT CAIE PDFs → private reference → Gemini outlines → optional lessons.
 *
 * Does NOT paste PMT text onto course pages. Gemini writes original lessons + flashcards.
 *
 *   pnpm course:from-pmt -- --code 9702 --parent 12
 *   pnpm course:from-pmt -- --code 9702 --topic 12.2 --generate --diagrams
 *   pnpm course:from-pmt -- --code 9702 --limit 3 --generate
 *   pnpm course:from-pmt -- --code 9702 --dry-run
 *
 * Private storage (gitignored):
 *   content/source-notes/9702/_pmt-import/12/*.pdf
 *   content/source-notes/9702/12.2.md  (Gemini outline per leaf topic)
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { GEMINI_FLASH_MODEL } from '../lib/ai/gemini-models.mjs'
import {
  PMT_CAIE_INDEX,
  buildTopicCatalog,
  extractPdfLinks,
  fetchBuffer,
  fetchHtml,
} from './lib/pmt-client.mjs'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')
const SOURCE_ROOT = path.join(PROJECT, 'content', 'source-notes')

function loadEnvLocal() {
  const envPath = path.join(PROJECT, '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvLocal()

const args = process.argv.slice(2)
function getArg(name) {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? null : args[i + 1]
}

const subjectCode = getArg('code') || '9702'
const singleTopic = getArg('topic')
const singleParent = getArg('parent')
const limit = getArg('limit') ? parseInt(getArg('limit'), 10) : null
const dryRun = args.includes('--dry-run')
const force = args.includes('--force')
const forceParent = args.includes('--force-parent')
const generate = args.includes('--generate')
const withDiagrams = args.includes('--diagrams')

if (!PMT_CAIE_INDEX[subjectCode]) {
  console.error(`Supported: ${Object.keys(PMT_CAIE_INDEX).join(', ')}`)
  process.exit(1)
}

if (!process.env.GEMINI_API_KEY && !dryRun) {
  console.error('Set GEMINI_API_KEY in .env.local')
  process.exit(1)
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function loadSyllabus(code) {
  const file = path.join(PROJECT, 'lib', 'syllabi', `${code}.json`)
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  return { subjectName: data.subjectName, topics: data.topics, parents: data.parents || [] }
}

function topicToSlug(topicCode, topicName) {
  const namePart = topicName
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${topicCode.replace(/\./g, '-')}-${namePart}`
}

function safeFilename(label) {
  return label.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80)
}

async function geminiCall(parts, label = 'gemini') {
  const { GoogleGenAI } = await import('@google/genai')
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  let lastErr
  for (let i = 1; i <= 4; i++) {
    try {
      const res = await genAI.models.generateContent({
        model: GEMINI_FLASH_MODEL,
        contents: [{ role: 'user', parts }],
      })
      return (res.text || '').trim()
    } catch (err) {
      lastErr = err
      if (i < 4) {
        const wait = 1200 * 2 ** (i - 1)
        console.warn(`    ${label} retry ${i}/3 in ${wait}ms (${err.message})`)
        await sleep(wait)
      }
    }
  }
  throw lastErr
}

async function geminiWithPdf(pdfBuffer, prompt) {
  return geminiCall(
    [
      { inlineData: { mimeType: 'application/pdf', data: pdfBuffer.toString('base64') } },
      { text: prompt },
    ],
    'gemini-pdf'
  )
}

async function geminiText(prompt) {
  return geminiCall([{ text: prompt }], 'gemini')
}

async function downloadPdfs(parentCode, pdfs, importDir) {
  fs.mkdirSync(importDir, { recursive: true })
  const localPaths = []
  for (const pdf of pdfs) {
    const fname = safeFilename(pdf.label) + '.pdf'
    const outPath = path.join(importDir, fname)
    if (fs.existsSync(outPath) && !force) {
      localPaths.push({ ...pdf, localPath: outPath })
      continue
    }
    console.log(`    download: ${pdf.label}`)
    try {
      const buf = await fetchBuffer(pdf.href)
      fs.writeFileSync(outPath, buf)
      localPaths.push({ ...pdf, localPath: outPath })
      await sleep(400)
    } catch (err) {
      console.warn(`    failed: ${pdf.label} — ${err.message}`)
    }
  }
  return localPaths
}

async function buildParentOutline(subjectCode, subjectName, parentCode, parentName, pdfPaths) {
  const chunks = []
  for (const { label, localPath } of pdfPaths) {
    const buf = fs.readFileSync(localPath)
    const text = await geminiWithPdf(
      buf,
      `You are helping teachers at a licensed school build ORIGINAL revision materials.

Subject: Cambridge ${subjectName} ${subjectCode}
Parent topic: ${parentCode} — ${parentName}
Document: ${label}

Extract a factual syllabus outline as markdown bullets:
- Key definitions and symbols
- Formulas (LaTeX ok)
- Typical exam points / misconceptions
- Do NOT copy sentences verbatim from the PDF — paraphrase in short bullets only
- Max 40 bullets`
    )
    chunks.push(`## From ${label}\n\n${text}`)
    await sleep(600)
  }
  return chunks.join('\n\n')
}

async function buildLeafOutline(
  subjectCode,
  subjectName,
  leaf,
  parentOutline,
  parentName
) {
  return geminiText(`You are helping teachers build ORIGINAL revision notes.

Subject: Cambridge ${subjectName} ${subjectCode}
Subtopic: ${leaf.code} — ${leaf.name}
Parent topic: ${parentName}

Using ONLY the reference outline below, write a focused markdown outline for THIS subtopic only.
- 15–25 short bullets, paraphrased (not copied from any textbook)
- Include formulas if relevant
- Add 5 "flashcard seeds" at the end as pairs: Q: ... / A: ...

REFERENCE OUTLINE:
${parentOutline.slice(0, 12000)}`)
}

async function runLessonGeneration(topicCode) {
  const { spawn } = await import('child_process')
  return new Promise((resolve, reject) => {
    const extra = ['--code', subjectCode, '--topic', topicCode]
    if (withDiagrams) extra.push('--diagrams')
    if (force) extra.push('--force')
    const child = spawn('node', ['scripts/enrich-course-from-notes.mjs', ...extra], {
      cwd: PROJECT,
      stdio: 'inherit',
      shell: true,
    })
    child.on('exit', (code) =>
      code === 0 ? resolve() : resolve({ failed: true, code })
    )
  })
}

async function main() {
  const { subjectName, topics, parents } = loadSyllabus(subjectCode)
  const indexUrl = PMT_CAIE_INDEX[subjectCode]
  const notesDir = path.join(SOURCE_ROOT, subjectCode)
  fs.mkdirSync(notesDir, { recursive: true })

  console.log(`\nSchool PMT ingest — ${subjectName} (${subjectCode})`)
  console.log(`Index: ${indexUrl}\n`)

  const indexHtml = await fetchHtml(indexUrl)
  const catalog = buildTopicCatalog(subjectCode, indexUrl, indexHtml)
  console.log(`Topic catalog: ${catalog.length} parent topics\n`)

  let leafQueue = topics
  if (singleTopic) leafQueue = leafQueue.filter((t) => t.code === singleTopic)
  if (singleParent) {
    leafQueue = leafQueue.filter(
      (t) => (t.parent || t.code.split('.')[0]) === singleParent
    )
  }
  if (limit) leafQueue = leafQueue.slice(0, limit)

  const parentsNeeded = [
    ...new Set(leafQueue.map((t) => t.parent || t.code.split('.')[0])),
  ]

  const parentOutlines = {}

  for (const parentCode of parentsNeeded) {
    const topicPage = catalog.find((t) => t.parentCode === parentCode)
    if (!topicPage) {
      console.warn(`  No PMT page for parent ${parentCode}`)
      continue
    }

    const parentMeta = parents.find((p) => p.code === parentCode)
    const parentName = parentMeta?.name || topicPage.label

    console.log(`Parent ${parentCode}: ${topicPage.url}`)
    await sleep(700)

    let pdfs = []
    try {
      const html = await fetchHtml(topicPage.url)
      pdfs = extractPdfLinks(html)
      console.log(`  ${pdfs.length} PDF(s) on topic page`)
    } catch (err) {
      console.warn(`  Could not fetch topic page: ${err.message}`)
      continue
    }

    if (!pdfs.length) continue

    const parentOutlinePath = path.join(notesDir, '_pmt-import', `${parentCode}-outline.md`)
    if (fs.existsSync(parentOutlinePath) && !forceParent) {
      parentOutlines[parentCode] = fs.readFileSync(parentOutlinePath, 'utf8')
      console.log(`  reuse ${path.relative(PROJECT, parentOutlinePath)}`)
      continue
    }

    const importDir = path.join(notesDir, '_pmt-import', parentCode)
    if (dryRun) {
      console.log(`  [dry-run] would download to ${path.relative(PROJECT, importDir)}`)
      parentOutlines[parentCode] = `[dry-run outline for topic ${parentCode}]`
      continue
    }

    const localPdfs = await downloadPdfs(parentCode, pdfs, importDir)
    if (!localPdfs.length) {
      console.warn(`  No PDFs downloaded for parent ${parentCode}`)
      continue
    }
    try {
      console.log(`  Gemini: extracting outline from PDFs…`)
      parentOutlines[parentCode] = await buildParentOutline(
        subjectCode,
        subjectName,
        parentCode,
        parentName,
        localPdfs
      )
      fs.writeFileSync(parentOutlinePath, parentOutlines[parentCode] + '\n')
      console.log(`  saved ${path.relative(PROJECT, parentOutlinePath)}`)
    } catch (err) {
      console.warn(`  parent ${parentCode} outline failed: ${err.message}`)
    }
  }

  let outlinesOk = 0
  for (const leaf of leafQueue) {
    const parent = leaf.parent || leaf.code.split('.')[0]
    const parentOutline = parentOutlines[parent]
    if (!parentOutline) {
      console.log(`  ○ ${leaf.code} — no parent outline`)
      continue
    }

    const outPath = path.join(notesDir, `${leaf.code}.md`)
    if (fs.existsSync(outPath) && !force) {
      console.log(`  skip ${leaf.code} (outline exists)`)
      continue
    }

    console.log(`  → leaf ${leaf.code} ${leaf.name}`)
    if (dryRun) continue

    try {
      const parentMeta = parents.find((p) => p.code === parent)
      const outline = await buildLeafOutline(
        subjectCode,
        subjectName,
        leaf,
        parentOutline,
        parentMeta?.name || `Topic ${parent}`
      )
      fs.writeFileSync(
        outPath,
        `# ${leaf.code} ${leaf.name}\n\n_Source: school PMT ingest — factual outline for original lesson generation._\n\n${outline}\n`
      )
      outlinesOk++
      await sleep(500)
    } catch (err) {
      console.warn(`  leaf ${leaf.code} outline failed: ${err.message}`)
      continue
    }

    if (generate) {
      console.log(`    generating premium lesson…`)
      const result = await runLessonGeneration(leaf.code)
      if (result?.failed) {
        console.warn(`    lesson generation failed for ${leaf.code} (exit ${result.code})`)
      }
    }
  }

  console.log(`\nDone. ${outlinesOk} leaf outline(s) in content/source-notes/${subjectCode}/`)
  if (!generate && outlinesOk > 0) {
    console.log(`\nNext: pnpm course:from-notes -- --code ${subjectCode} --diagrams`)
  }
  if (generate) {
    console.log(`\nLessons updated in content/courses/${subjectCode}/`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
