#!/usr/bin/env node
/**
 * Transform YOUR uploaded notes into original premium lessons via Gemini.
 *
 *   pnpm course:from-notes -- --code 9702 --topic 12.2
 *   pnpm course:from-notes -- --code 9702 --limit 5
 *   pnpm course:from-notes -- --code 9702 --diagrams
 *   pnpm course:from-notes -- --code 9702 --dry-run
 *
 * Upload notes to: content/source-notes/{code}/
 * See content/source-notes/README.md
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { GEMINI_PRO_MODEL } from '../lib/ai/gemini-models.mjs'

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

const subjectCode = getArg('code')
const singleTopic = getArg('topic')
const limit = getArg('limit') ? parseInt(getArg('limit'), 10) : null
const dryRun = args.includes('--dry-run')
const force = args.includes('--force')
const withDiagrams = args.includes('--diagrams')

if (!subjectCode) {
  console.error('Usage: pnpm course:from-notes -- --code 9702 [--topic 12.2] [--diagrams] [--dry-run]')
  process.exit(1)
}

function topicToSlug(topicCode, topicName) {
  const namePart = topicName
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${topicCode.replace(/\./g, '-')}-${namePart}`
}

function loadSyllabus(code) {
  if (code === '9709') {
    const raw = fs.readFileSync(path.join(PROJECT, 'lib', 'syllabus.ts'), 'utf8')
    const topics = []
    const re =
      /\{\s*code:\s*'([^']+)',\s*paper:\s*'([^']+)',\s*paperName:\s*'([^']+)',\s*name:\s*'([^']+)'\s*\}/g
    let m
    while ((m = re.exec(raw))) {
      topics.push({ code: m[1], paper: m[2], paperName: m[3], name: m[4] })
    }
    return { subjectName: 'Mathematics', topics }
  }
  const file = path.join(PROJECT, 'lib', 'syllabi', `${code}.json`)
  if (!fs.existsSync(file)) throw new Error(`No syllabus for ${code}`)
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  return { subjectName: data.subjectName, topics: data.topics }
}

function repairJsonEscapes(raw) {
  let result = ''
  let inString = false
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]
    if (!inString) {
      result += c
      if (c === '"') inString = true
      continue
    }
    if (c === '\\') {
      const next = raw[i + 1]
      if (next === 'u' && /^[0-9a-fA-F]{4}$/.test(raw.slice(i + 2, i + 6))) {
        result += raw.slice(i, i + 6)
        i += 5
        continue
      }
      if (next && /^["\\/bfnrt]$/.test(next)) {
        result += c + next
        i++
        continue
      }
      result += '\\\\'
      continue
    }
    if (c === '"') inString = false
    result += c
  }
  return result
}

function extractJSON(text) {
  let raw = text.trim()
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) raw = fenced[1].trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start !== -1 && end > start) raw = raw.slice(start, end + 1)
  try {
    return JSON.parse(raw)
  } catch {
    return JSON.parse(repairJsonEscapes(raw))
  }
}

function readTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.pdf') {
    console.warn(`  PDF notes need manual export to .md first: ${path.basename(filePath)}`)
    return null
  }
  return fs.readFileSync(filePath, 'utf8').trim()
}

function extractFromFullNotes(fullText, topicCode, topicName) {
  const codeEsc = topicCode.replace(/\./g, '\\.')
  const patterns = [
    new RegExp(`(?:^|\\n)#+\\s*${codeEsc}[^\\n]*\\n([\\s\\S]*?)(?=\\n#+\\s*\\d|$)`, 'i'),
    new RegExp(`(?:^|\\n)#+\\s*[^\\n]*${codeEsc}[^\\n]*\\n([\\s\\S]*?)(?=\\n#+\\s*\\d|$)`, 'i'),
    new RegExp(`(?:^|\\n)${codeEsc}\\s+${topicName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?(?=\\n\\d+\\.\\d+|$)`, 'i'),
  ]
  for (const re of patterns) {
    const m = fullText.match(re)
    if (m?.[0]?.trim() && m[0].trim().length > 80) return m[0].trim()
  }
  return null
}

function findSourceNote(subjectCode, topic) {
  const dir = path.join(SOURCE_ROOT, subjectCode)
  if (!fs.existsSync(dir)) return { text: null, source: null }

  const slug = topicToSlug(topic.code, topic.name)
  const codeDash = topic.code.replace(/\./g, '-')
  const candidates = [
    `${topic.code}.md`,
    `${topic.code}.txt`,
    `${codeDash}.md`,
    `${codeDash}.txt`,
    `${slug}.md`,
    `${slug}.txt`,
  ]

  for (const name of candidates) {
    const p = path.join(dir, name)
    if (fs.existsSync(p)) {
      const text = readTextFile(p)
      if (text) return { text, source: `content/source-notes/${subjectCode}/${name}` }
    }
  }

  const fullNames = ['_full.md', `${subjectCode}-full.md`, 'notes.md', '_full.txt']
  for (const name of fullNames) {
    const p = path.join(dir, name)
    if (!fs.existsSync(p)) continue
    const full = readTextFile(p)
    if (!full) continue
    const section = extractFromFullNotes(full, topic.code, topic.name)
    if (section) {
      return { text: section, source: `content/source-notes/${subjectCode}/${name}#${topic.code}` }
    }
  }

  return { text: null, source: null }
}

function buildPromptFromNotes(subjectCode, subjectName, topic, sourceText) {
  const truncated =
    sourceText.length > 14000 ? `${sourceText.slice(0, 14000)}\n\n[truncated…]` : sourceText

  return `You are creating a PREMIUM Cambridge ${subjectName} (${subjectCode}) revision lesson.

Topic: ${topic.code} — ${topic.name}
Paper: ${topic.paperName} (${topic.paper})

The student uploaded REFERENCE NOTES below. These are for factual coverage only.

CRITICAL RULES:
1. Write COMPLETELY ORIGINAL lesson text — do NOT copy sentences from the notes or any third-party site.
2. Use the notes to ensure syllabus coverage, then rewrite in your own words for 15–17 year olds.
3. Prioritise VISUAL learning: short sections, flashcards, steps, formulas — not essay walls.
4. Include 8–12 revision flashcards (front = question/term, back = concise answer).
5. Include a "diagramPrompt" — one paragraph describing an educational diagram Gemini should draw.

REFERENCE NOTES (do not copy verbatim):
---
${truncated}
---

Return ONLY valid JSON. In all string values, escape backslashes (use \\\\frac not \\frac). Avoid raw LaTeX backslash sequences inside JSON strings — write formulas in plain text or double every backslash.
{
  "slug": "${topicToSlug(topic.code, topic.name)}",
  "topicCode": "${topic.code}",
  "title": "${topic.name}",
  "paper": "${topic.paper}",
  "paperName": "${topic.paperName.replace(/"/g, '\\"')}",
  "status": "premium",
  "summary": "120-155 char SEO description",
  "durationMin": 15-25,
  "learningObjectives": ["3 outcomes"],
  "simpleExplanation": {
    "title": "short title",
    "summary": "2-3 plain English sentences",
    "analogy": "relatable analogy",
    "steps": ["4 visual revision steps"]
  },
  "flashcards": [
    { "front": "question or term", "back": "short answer" }
  ],
  "diagramPrompt": "Describe a flat educational diagram for this topic: labels, layout, white background, no watermark",
  "sections": [
    { "type": "intro", "content": "engaging intro with **bold** terms, max 80 words" },
    { "type": "heading", "content": "..." },
    { "type": "text", "content": "short paragraph max 80 words" },
    { "type": "formula", "content": "key equation if applicable" },
    { "type": "keyPoints", "items": ["4-6 examiner bullets, max 20 words each"] },
    { "type": "workedExample", "question": "...", "solution": "numbered steps" },
    { "type": "examTip", "content": "..." },
    { "type": "practice", "label": "Mark a past-paper question on this topic", "href": "/mark?subject=${subjectCode}&topic=${encodeURIComponent(topic.code)}" },
    { "type": "resources", "items": [
      { "label": "${subjectCode} past paper guide", "href": "/subjects/${subjectCode}" },
      { "label": "How to read mark schemes", "href": "/blog/how-to-read-a-cambridge-mark-scheme" }
    ]}
  ],
  "faq": [
    { "q": "SEO question about ${topic.name}", "a": "..." },
    { "q": "second FAQ", "a": "..." },
    { "q": "third FAQ", "a": "..." }
  ],
  "updated": "${new Date().toISOString().slice(0, 10)}"
}

British English. Student-friendly premium tutor tone.`
}

async function generateWithGemini(prompt) {
  const { GoogleGenAI } = await import('@google/genai')
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  let lastErr
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await genAI.models.generateContent({
        model: GEMINI_PRO_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      })
      return extractJSON(res.text || '')
    } catch (err) {
      lastErr = err
      if (attempt < 3) {
        console.warn(`    gemini retry ${attempt}/2 (${String(err.message || err).slice(0, 70)})`)
        await new Promise((r) => setTimeout(r, 1200 * attempt))
      }
    }
  }
  throw lastErr
}

async function generateDiagram(subjectCode, slug, prompt) {
  const { GoogleGenAI } = await import('@google/genai')
  const { GEMINI_IMAGE_MODELS } = await import('../lib/ai/gemini-models.mjs')
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  const outDir = path.join(PROJECT, 'public', 'courses', 'diagrams', subjectCode)
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, `${slug}.png`)

  const fullPrompt = `${prompt}\nStyle: clean flat vector infographic, white background, readable English labels, exam revision quality, 16:9, no watermark.`

  for (const model of GEMINI_IMAGE_MODELS) {
    try {
      const res = await genAI.models.generateContent({
        model,
        contents: fullPrompt,
        config: { responseModalities: ['TEXT', 'IMAGE'] },
      })
      const parts = res.candidates?.[0]?.content?.parts ?? []
      for (const part of parts) {
        if (part.inlineData?.data) {
          fs.writeFileSync(outPath, Buffer.from(part.inlineData.data, 'base64'))
          return outPath
        }
      }
    } catch (err) {
      console.warn(`    diagram model ${model} failed:`, err.message?.slice(0, 80))
    }
  }
  return null
}

const { subjectName, topics } = loadSyllabus(subjectCode)
let queue = topics
if (singleTopic) queue = queue.filter((t) => t.code === singleTopic)
if (limit) queue = queue.slice(0, limit)

const notesDir = path.join(SOURCE_ROOT, subjectCode)
if (!fs.existsSync(notesDir)) {
  console.error(`\nNo notes folder: content/source-notes/${subjectCode}/`)
  console.error('Create it and add .md files per topic. See content/source-notes/README.md\n')
  process.exit(1)
}

if (!process.env.GEMINI_API_KEY) {
  console.error('Set GEMINI_API_KEY in .env.local')
  process.exit(1)
}

const outDir = path.join(PROJECT, 'content', 'courses', subjectCode)
fs.mkdirSync(outDir, { recursive: true })

console.log(`\nNotes → lessons for ${subjectName} (${subjectCode}) via ${GEMINI_PRO_MODEL}\n`)

let ok = 0
let skip = 0
let noNotes = 0
let fail = 0

for (const topic of queue) {
  const slug = topicToSlug(topic.code, topic.name)
  const outPath = path.join(outDir, `${slug}.json`)
  const { text: sourceText, source } = findSourceNote(subjectCode, topic)

  if (!sourceText) {
    console.log(`  ○ ${topic.code} ${topic.name} — no matching note file`)
    noNotes++
    continue
  }

  if (fs.existsSync(outPath) && !force) {
    console.log(`  skip ${topic.code} (lesson exists, use --force)`)
    skip++
    continue
  }

  console.log(`  → ${topic.code} ${topic.name}`)
  console.log(`    source: ${source}`)

  if (dryRun) continue

  try {
    const lesson = await generateWithGemini(
      buildPromptFromNotes(subjectCode, subjectName, topic, sourceText)
    )

    if (withDiagrams && lesson.diagramPrompt) {
      const diagramPath = await generateDiagram(subjectCode, slug, lesson.diagramPrompt)
      if (diagramPath) {
        lesson.diagram = {
          src: `/courses/diagrams/${subjectCode}/${slug}.png`,
          alt: `${topic.name} revision diagram for Cambridge ${subjectCode}`,
        }
        console.log(`    diagram: ${path.relative(PROJECT, diagramPath)}`)
      }
    }

    delete lesson.diagramPrompt

    fs.writeFileSync(outPath, JSON.stringify(lesson, null, 2) + '\n')
    ok++
    await new Promise((r) => setTimeout(r, 600))
  } catch (err) {
    console.error(`    FAILED:`, err.message?.slice(0, 120) || err)
    fail++
  }
}

console.log(`\nDone: ${ok} generated, ${skip} skipped, ${noNotes} without notes, ${fail} failed`)
if (noNotes > 0) {
  console.log(`\nAdd files like content/source-notes/${subjectCode}/${singleTopic || '12.2'}.md`)
}
