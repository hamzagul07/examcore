#!/usr/bin/env node
/**
 * Generate topic diagrams for course lessons using Gemini image models.
 *
 *   node scripts/generate-course-diagram.mjs --code 9702 --topic 9.1
 *   node scripts/generate-course-diagram.mjs --code 9702 --limit 5
 *
 * Requires GEMINI_API_KEY in .env.local.
 * Output: public/courses/diagrams/{code}/{slug}.png
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { GEMINI_IMAGE_MODELS } from '../lib/ai/gemini-models.mjs'

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
const force = args.includes('--force')

if (!subjectCode) {
  console.error('Usage: node scripts/generate-course-diagram.mjs --code 9702 [--topic 9.1] [--limit 5]')
  process.exit(1)
}

if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY required in .env.local')
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
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  return { subjectName: data.subjectName, topics: data.topics }
}

function diagramPrompt(subjectCode, subjectName, topic) {
  return `Educational science diagram for Cambridge A Level ${subjectName} (${subjectCode}).
Topic: ${topic.code} — ${topic.name}.

Style: clean flat vector infographic, white background, labelled parts with arrows, exam-revision quality.
No watermark, no cartoon characters, no cluttered text. Use clear English labels for key structures only.
Aspect ratio 16:9. Suitable for a free revision website.`
}

async function generateDiagram(prompt) {
  const { GoogleGenAI } = await import('@google/genai')
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  for (const model of GEMINI_IMAGE_MODELS) {
    try {
      const res = await genAI.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      })
      const parts = res.candidates?.[0]?.content?.parts ?? []
      for (const part of parts) {
        if (part.inlineData?.data) {
          return Buffer.from(part.inlineData.data, 'base64')
        }
      }
    } catch (err) {
      console.warn(`  Model ${model} failed: ${err.message}`)
    }
  }
  return null
}

async function main() {
  const { subjectName, topics } = loadSyllabus(subjectCode)
  let list = topics
  if (singleTopic) list = list.filter((t) => t.code === singleTopic)
  if (limit) list = list.slice(0, limit)

  const outDir = path.join(PROJECT, 'public', 'courses', 'diagrams', subjectCode)
  fs.mkdirSync(outDir, { recursive: true })

  let ok = 0
  let skip = 0
  for (const topic of list) {
    const slug = topicToSlug(topic.code, topic.name)
    const outPath = path.join(outDir, `${slug}.png`)
    if (fs.existsSync(outPath) && !force) {
      skip++
      continue
    }
    console.log(`Generating diagram: ${topic.code} ${topic.name}`)
    const buffer = await generateDiagram(diagramPrompt(subjectCode, subjectName, topic))
    if (!buffer) {
      console.error(`  Failed for ${topic.code}`)
      continue
    }
    fs.writeFileSync(outPath, buffer)
    ok++
    await new Promise((r) => setTimeout(r, 1500))
  }

  console.log(`Done. Generated ${ok}, skipped ${skip}.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
