#!/usr/bin/env node
/**
 * Batch-generate premium course lessons with Gemini (original content only).
 *
 *   node scripts/batch-generate-course.mjs --code 9702
 *   node scripts/batch-generate-course.mjs --code 9702 --topic 9.1
 *   node scripts/batch-generate-course.mjs --code 9702 --limit 5 --dry-run
 *
 * Requires GEMINI_API_KEY in .env.local (model: gemini-2.5-flash).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { GEMINI_TEXT_MODEL } from '../lib/ai/gemini-models.mjs'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')

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

if (!subjectCode) {
  console.error('Usage: node scripts/batch-generate-course.mjs --code 9702 [--topic 9.1] [--limit 5]')
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

function extractJSON(text) {
  let raw = text.trim()
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) raw = fenced[1].trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start !== -1 && end > start) raw = raw.slice(start, end + 1)
  return JSON.parse(raw)
}

function buildPrompt(subjectCode, subjectName, topic) {
  return `You are writing a PREMIUM free revision lesson for Cambridge International ${subjectName} syllabus ${subjectCode}.

Topic: ${topic.code} — ${topic.name}
Paper: ${topic.paperName} (${topic.paper})

Write ORIGINAL content aligned to the official Cambridge syllabus. Do NOT copy ZNotes, Save My Exams, Physics & Maths Tutor, or any third-party notes.

VISUAL-FIRST RULES (critical):
- Students learn from diagrams and bite-sized cards, not long essays.
- Keep each "text" section under 80 words. Use more headings + short paragraphs instead of one wall of text.
- "keyPoints" must be 4-6 short bullets (max 20 words each) — these power the step carousel.
- "simpleExplanation.steps" must be 4 clear visual steps a 15-year-old can picture.
- Include at least one "formula" section when the topic has a key equation.
- "workedExample" solution should use numbered lines students can follow.

Return ONLY valid JSON (no markdown outside the JSON) matching this schema:
{
  "slug": "${topicToSlug(topic.code, topic.name)}",
  "topicCode": "${topic.code}",
  "title": "${topic.name}",
  "paper": "${topic.paper}",
  "paperName": "${topic.paperName.replace(/"/g, '\\"')}",
  "status": "premium",
  "summary": "120-155 char meta description for SEO",
  "durationMin": 15-25,
  "learningObjectives": ["3 specific outcomes"],
  "simpleExplanation": {
    "title": "short title",
    "summary": "2-3 sentences in plain English",
    "analogy": "one relatable analogy",
    "steps": ["4 simple revision steps"]
  },
  "sections": [
    { "type": "intro", "content": "engaging intro with **bold** key terms" },
    { "type": "heading", "content": "..." },
    { "type": "text", "content": "..." },
    { "type": "formula", "content": "key equation if applicable" },
    { "type": "keyPoints", "items": ["4-6 examiner-focused bullets"] },
    { "type": "workedExample", "question": "...", "solution": "step-by-step" },
    { "type": "examTip", "content": "..." },
    { "type": "practice", "label": "Mark a past-paper question on this topic", "href": "/mark?subject=${subjectCode}&topic=${encodeURIComponent(topic.code)}" },
    { "type": "resources", "items": [
      { "label": "${subjectCode} past paper guide", "href": "/subjects/${subjectCode}" },
      { "label": "How to read mark schemes", "href": "/blog/how-to-read-a-cambridge-mark-scheme" }
    ]}
  ],
  "faq": [
    { "q": "SEO question about ${topic.name} ${subjectCode}", "a": "helpful answer mentioning free course and past papers" },
    { "q": "second FAQ", "a": "..." },
    { "q": "third FAQ", "a": "..." }
  ],
  "updated": "${new Date().toISOString().slice(0, 10)}"
}

Tone: confident, student-friendly, premium — like a top tutor wrote it. Use British English.`
}

async function generateWithGemini(prompt) {
  const { GoogleGenAI } = await import('@google/genai')
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  const res = await genAI.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })
  const text = res.text || ''
  return extractJSON(text)
}

async function generateLesson(prompt, provider) {
  if (provider === 'gemini') return generateWithGemini(prompt)
  return generateWithClaude(prompt)
}

const { subjectName, topics } = loadSyllabus(subjectCode)
let queue = topics
if (singleTopic) queue = queue.filter((t) => t.code === singleTopic)
if (limit) queue = queue.slice(0, limit)

const outDir = path.join(PROJECT, 'content', 'courses', subjectCode)
fs.mkdirSync(outDir, { recursive: true })

if (!process.env.GEMINI_API_KEY) {
  console.error('Set GEMINI_API_KEY in .env.local')
  process.exit(1)
}

console.log(
  `Generating ${queue.length} premium lessons for ${subjectName} (${subjectCode}) via ${GEMINI_TEXT_MODEL}…`
)

let ok = 0
let skip = 0
let fail = 0
for (const topic of queue) {
  const slug = topicToSlug(topic.code, topic.name)
  const outPath = path.join(outDir, `${slug}.json`)
  if (fs.existsSync(outPath) && !force) {
    console.log(`  skip ${topic.code} ${topic.name} (exists)`)
    skip++
    continue
  }
  console.log(`  → ${topic.code} ${topic.name}`)
  if (dryRun) continue

  const prompt = buildPrompt(subjectCode, subjectName, topic)
  let written = false

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const lesson = await generateLesson(prompt)
      fs.writeFileSync(outPath, JSON.stringify(lesson, null, 2) + '\n')
      ok++
      written = true
      await new Promise((r) => setTimeout(r, 500))
      break
    } catch (err) {
      if (attempt === 3) {
        console.error(`    FAILED ${topic.code}:`, err.message?.slice?.(0, 120) || err)
        fail++
      } else {
        console.warn(`    retry ${topic.code} (${attempt}/3)`)
        await new Promise((r) => setTimeout(r, 1200))
      }
    }
  }
  if (!written && !dryRun) {
    // already counted in fail
  }
}

console.log(`Done. wrote=${ok} skipped=${skip} failed=${fail} provider=${provider} dryRun=${dryRun}`)
if (fail > 0) {
  console.log(`Resume: node scripts/batch-generate-course.mjs --code ${subjectCode}`)
  console.log(`Status: node scripts/course-status.mjs ${subjectCode}`)
}
