#!/usr/bin/env node
/** Show premium lesson coverage per subject. */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const PROJECT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const code = process.argv.find((a) => a.startsWith('--code='))?.split('=')[1] || process.argv[2]

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

if (!code) {
  console.log('Usage: node scripts/course-status.mjs 9702')
  process.exit(1)
}

const topics = loadTopics(code)
if (!topics) {
  console.error(`No syllabus for ${code}`)
  process.exit(1)
}

const dir = path.join(PROJECT, 'content', 'courses', code)
const done = fs.existsSync(dir)
  ? new Set(fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')))
  : new Set()

const missing = topics.filter((t) => !done.has(topicToSlug(t.code, t.name)))

console.log(`${code}: ${done.size}/${topics.length} premium lessons`)
if (missing.length) {
  console.log('\nMissing:')
  for (const t of missing) console.log(`  ${t.code} ${t.name}`)
}
