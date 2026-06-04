#!/usr/bin/env node
/** Lint blog chunks for fan-out retrieval readiness. */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const blogDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'content', 'blog')

function parseChunks(content, slug) {
  // minimal mirror of parseFanOutChunks
  const lines = content.split('\n')
  const chunks = []
  let heading = ''
  let body = []
  const flush = () => {
    if (!heading) return
    const text = body.join(' ').trim()
    const words = text.split(/\s+/).filter(Boolean).length
    chunks.push({ heading, words, slug })
    heading = ''
    body = []
  }
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)/)
    if (h2) {
      flush()
      heading = h2[1]
      continue
    }
    if (heading) body.push(line)
  }
  flush()
  return chunks
}

let issues = 0
for (const f of fs.readdirSync(blogDir).filter((x) => x.endsWith('.md'))) {
  const slug = f.replace(/\.md$/, '')
  const content = fs.readFileSync(path.join(blogDir, f), 'utf8').replace(/^---[\s\S]*?---\n/, '')
  const chunks = parseChunks(content, slug)
  if (chunks.length < 2) {
    console.log(`! ${slug}: fewer than 2 H2 sections (weak fan-out)`)
    issues++
  }
  for (const c of chunks) {
    if (c.words < 40) {
      console.log(`! ${slug} → "${c.heading.slice(0, 40)}": only ${c.words} words`)
      issues++
    }
  }
}
console.log(issues ? `\n${issues} chunk issues` : 'All posts pass basic fan-out lint')
process.exit(issues > 20 ? 1 : 0)
