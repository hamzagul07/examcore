#!/usr/bin/env node
/** Find blog posts with overlapping keywords (potential cannibalization). */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const blogDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'content', 'blog')

function parse(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return { title: '', keywords: [] }
  const meta = {}
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':')
    if (i === -1) continue
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '')
  }
  const keywords = (meta.keywords || '')
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean)
  return { title: meta.title || '', keywords }
}

const posts = fs
  .readdirSync(blogDir)
  .filter((f) => f.endsWith('.md'))
  .map((f) => {
    const slug = f.replace(/\.md$/, '')
    const { title, keywords } = parse(fs.readFileSync(path.join(blogDir, f), 'utf8'))
    return { slug, title, keywords }
  })

console.log('=== Cannibalization pairs (keyword overlap ≥ 2) ===\n')
let pairs = 0
for (let i = 0; i < posts.length; i++) {
  for (let j = i + 1; j < posts.length; j++) {
    const a = posts[i]
    const b = posts[j]
    const setB = new Set(b.keywords)
    const overlap = a.keywords.filter((k) => setB.has(k))
    if (overlap.length >= 2) {
      pairs++
      console.log(`• "${a.title.slice(0, 50)}"`)
      console.log(`  /blog/${a.slug}`)
      console.log(`  vs "${b.title.slice(0, 50)}"`)
      console.log(`  /blog/${b.slug}`)
      console.log(`  shared: ${overlap.join(', ')}\n`)
    }
  }
}
console.log(`Total pairs: ${pairs}`)
console.log('\nAction: consolidate into one pillar or differentiate keywords/intent.')
