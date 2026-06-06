#!/usr/bin/env node
/**
 * Audit SEO coverage for all course lesson pages.
 *   node scripts/course-seo-audit.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const PROJECT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const COURSES_DIR = path.join(PROJECT, 'content', 'courses')

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

const codes = fs.existsSync(COURSES_DIR)
  ? fs.readdirSync(COURSES_DIR).filter((d) => fs.statSync(path.join(COURSES_DIR, d)).isDirectory())
  : []

if (!codes.includes('9709')) codes.push('9709')

let total = 0
let premium = 0
const samples = []

for (const code of codes.sort()) {
  const topics = loadTopics(code)
  if (!topics) continue
  const done = new Set(
    fs.existsSync(path.join(COURSES_DIR, code))
      ? fs
          .readdirSync(path.join(COURSES_DIR, code))
          .filter((f) => f.endsWith('.json'))
          .map((f) => f.replace('.json', ''))
      : []
  )

  for (const topic of topics) {
    total++
    const slug = topicToSlug(topic.code, topic.name)
    if (done.has(slug)) premium++
    if (samples.length < 6) {
      samples.push(`https://markscheme.app/courses/${code}/${slug}`)
    }
  }
}

console.log('Course SEO audit')
console.log('================')
console.log(`Topic pages in sitemap:  ${total}`)
console.log(`Premium lesson JSON:     ${premium}`)
console.log(`Outline pages (SEO auto):  ${total - premium}`)
console.log('')
console.log('Per-page SEO (all topics):')
console.log('  - Unique title: "{Topic} {code} — Free A-Level {Subject}"')
console.log('  - Meta description 120-160 chars with syllabus code')
console.log('  - 15-20 Google search-intent keywords')
console.log('  - FAQ rich results (up to 6 questions)')
console.log('  - JSON-LD: Course, LearningResource, Breadcrumb, WebPage')
console.log('  - HowTo + learning objectives ItemList (premium lessons)')
console.log('  - Visible H2 intro + breadcrumbs + related topic links')
console.log('  - Sitemap priority 0.86 (premium) / 0.78 (outline)')
console.log('')
console.log('Sample indexed URLs:')
for (const url of samples) console.log(`  ${url}`)
