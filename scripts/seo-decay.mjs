#!/usr/bin/env node
/** Content decay — posts older than N months without `updated` frontmatter. */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const blogDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'content', 'blog')
const MONTHS = 4

function parse(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return {}
  const meta = {}
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':')
    if (i === -1) continue
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return meta
}

const cutoff = new Date()
cutoff.setMonth(cutoff.getMonth() - MONTHS)

const stale = fs
  .readdirSync(blogDir)
  .filter((f) => f.endsWith('.md'))
  .map((f) => {
    const meta = parse(fs.readFileSync(path.join(blogDir, f), 'utf8'))
    const date = meta.updated || meta.date
    return { slug: f.replace(/\.md$/, ''), title: meta.title, date }
  })
  .filter((p) => {
    if (!p.date) return true
    const d = new Date(p.date)
    return !Number.isNaN(d.getTime()) && d < cutoff
  })
  .sort((a, b) => (a.date < b.date ? 1 : -1))

console.log(`=== Posts to refresh (older than ${MONTHS} months) ===\n`)
stale.forEach((p) => {
  console.log(`• ${p.date || 'no date'} — ${p.title?.slice(0, 60)}`)
  console.log(`  /blog/${p.slug}`)
})
console.log(`\nTotal: ${stale.length}`)
console.log('Add `updated: YYYY-MM-DD` in frontmatter after refresh.')
