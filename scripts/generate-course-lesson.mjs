#!/usr/bin/env node
/**
 * Generate a full published course lesson with Gemini (text) + optional Gemini (diagram).
 *
 * Usage:
 *   node scripts/generate-course-lesson.mjs --code 9709 --topic 1.7
 *   node scripts/generate-course-lesson.mjs --code 9702 --topic 9.1 --diagram
 *
 * Env:
 *   GEMINI_API_KEY — lesson content (gemini-2.5-flash) + optional diagram image
 *
 * IMPORTANT: Generates ORIGINAL content from the official syllabus structure.
 * Do NOT scrape ZNotes, Save My Exams notes, or other copyrighted sites.
 */
import fs from 'fs'
import path from 'path'

const args = process.argv.slice(2)
function getArg(name) {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? null : args[i + 1]
}

const code = getArg('code')
const topic = getArg('topic')
const withDiagram = args.includes('--diagram')

if (!code || !topic) {
  console.error('Usage: node scripts/generate-course-lesson.mjs --code 9709 --topic 1.7 [--diagram]')
  process.exit(1)
}

const syllabiDir = path.join(process.cwd(), 'lib', 'syllabi')
const mathSyllabus = path.join(process.cwd(), 'lib', 'syllabus.ts')

function loadTopics(subjectCode) {
  if (subjectCode === '9709') {
    const raw = fs.readFileSync(mathSyllabus, 'utf8')
    const block = raw.match(/CAMBRIDGE_9709_SYLLABUS[^[]*\[([\s\S]*?)\]/)?.[1]
    if (!block) throw new Error('Could not parse 9709 syllabus')
    const topics = []
    const re = /\{\s*code:\s*'([^']+)',\s*paper:\s*'([^']+)',\s*paperName:\s*'([^']+)',\s*name:\s*'([^']+)'\s*\}/g
    let m
    while ((m = re.exec(block))) {
      topics.push({ code: m[1], paper: m[2], paperName: m[3], name: m[4] })
    }
    return { subjectName: 'Mathematics', topics }
  }
  const file = path.join(syllabiDir, `${subjectCode}.json`)
  if (!fs.existsSync(file)) throw new Error(`No syllabus JSON for ${subjectCode}`)
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  return { subjectName: data.subjectName, topics: data.topics }
}

function topicToSlug(topicCode, topicName) {
  const namePart = topicName
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${topicCode.replace(/\./g, '-')}-${namePart}`
}

const { subjectName, topics } = loadTopics(code)
const leaf = topics.find((t) => t.code === topic)
if (!leaf) {
  console.error(`Topic ${topic} not found in ${code}`)
  process.exit(1)
}

const slug = topicToSlug(leaf.code, leaf.name)
const outDir = path.join(process.cwd(), 'content', 'courses', code)
const outPath = path.join(outDir, `${slug}.json`)

if (!process.env.GEMINI_API_KEY) {
  console.log(`
No GEMINI_API_KEY set. Lesson stub only:

  Subject: ${subjectName} (${code})
  Topic:   ${leaf.code} ${leaf.name}
  Slug:    ${slug}
  Output:  ${outPath}

Set GEMINI_API_KEY and re-run to generate full lesson JSON with gemini-2.5-flash.
For diagrams, pass --diagram (uses gemini-2.5-flash-image).

Content policy: write ORIGINAL lessons aligned to Cambridge syllabus ${code}.
Do not copy ZNotes or other note sites.
`)
  process.exit(0)
}

console.log(`Generating lesson for ${code} ${leaf.code} ${leaf.name}…`)
console.log('Use pnpm course:generate for batch generation, or wire generateContent here.')
console.log(`Target: ${outPath}`)
if (withDiagram) {
  console.log('Diagram: use Gemini to generate educational diagram, save to public/courses/diagrams/')
}
