#!/usr/bin/env node
/** Report STEM lesson richness: outline / stub / pilot / premium per subject. */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const PROJECT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const STEM_CODES = ['9709', '9231', '9702', '9700', '9701', '9618']

function loadTopics(subjectCode) {
  if (subjectCode === '9709') {
    const raw = fs.readFileSync(path.join(PROJECT, 'lib', 'syllabus.ts'), 'utf8')
    const topics = []
    const re =
      /\{\s*code:\s*'([^']+)',\s*paper:\s*'([^']+)',\s*paperName:\s*'([^']+)',\s*name:\s*'([^']+)'\s*\}/g
    let m
    while ((m = re.exec(raw))) topics.push({ code: m[1], name: m[4] })
    return topics
  }
  const file = path.join(PROJECT, 'lib', 'syllabi', `${subjectCode}.json`)
  if (!fs.existsSync(file)) return null
  return JSON.parse(fs.readFileSync(file, 'utf8')).topics
}

function topicToSlug(topicCode, topicName) {
  const namePart = topicName
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${topicCode.replace(/\./g, '-')}-${namePart}`
}

function classifyLesson(raw, filename) {
  let lesson
  try {
    lesson = JSON.parse(raw)
  } catch {
    return { tier: 'invalid', file: filename }
  }

  const status = lesson.status ?? 'unknown'
  const hasWorked = raw.includes('"type": "workedExample"') || raw.includes('"type":"workedExample"')
  const sectionTypes = [...raw.matchAll(/"type":\s*"(\w+)"/g)].map((m) => m[1])
  const isThinStub =
    !hasWorked &&
    sectionTypes.length <= 4 &&
    sectionTypes.every((t) => ['intro', 'practice', 'resources', 'heading', 'text'].includes(t))

  if (status === 'outline' || (isThinStub && status === 'premium')) return { tier: 'stub', status, hasWorked }
  if (status === 'pilot') return { tier: 'pilot', status, hasWorked }
  if (status === 'premium' && hasWorked) return { tier: 'premium', status, hasWorked }
  if (hasWorked) return { tier: 'rich', status, hasWorked }
  return { tier: 'stub', status, hasWorked }
}

function scanSubject(code) {
  const dir = path.join(PROJECT, 'content', 'courses', code)
  const topics = loadTopics(code)
  const syllabusCount = topics?.length ?? 0

  if (!fs.existsSync(dir)) {
    return { code, files: 0, syllabusCount, stub: 0, pilot: 0, premium: 0, rich: 0, missing: syllabusCount }
  }

  const counts = { stub: 0, pilot: 0, premium: 0, rich: 0, invalid: 0 }
  const flatSlugs = new Set()

  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json') || f.endsWith('.pilot.json')) continue
    flatSlugs.add(f.replace('.json', ''))
    const tier = classifyLesson(fs.readFileSync(path.join(dir, f), 'utf8'), f).tier
    counts[tier] = (counts[tier] ?? 0) + 1
  }

  let missing = 0
  if (topics) {
    for (const t of topics) {
      if (!flatSlugs.has(topicToSlug(t.code, t.name))) missing++
    }
  }

  return {
    code,
    files: flatSlugs.size,
    syllabusCount,
    ...counts,
    missing,
  }
}

const rows = STEM_CODES.map(scanSubject)

console.log('\nSTEM Lesson Audit')
console.log('='.repeat(72))
console.log(
  'Code   Files  Syllabus  Stub  Pilot  Premium  Rich  Missing  Coverage'
)
for (const r of rows) {
  const cov = r.syllabusCount ? `${r.files}/${r.syllabusCount}` : `${r.files}/?`
  console.log(
    `${r.code}   ${String(r.files).padStart(5)}  ${String(r.syllabusCount).padStart(8)}  ${String(r.stub ?? 0).padStart(4)}  ${String(r.pilot ?? 0).padStart(5)}  ${String(r.premium ?? 0).padStart(7)}  ${String(r.rich ?? 0).padStart(4)}  ${String(r.missing ?? 0).padStart(7)}  ${cov}`
  )
}
console.log('='.repeat(72))
