#!/usr/bin/env node
/**
 * Fail if GEO pillar posts or featured editorials lack ## Quick answer.
 * See docs/GEO_SYNC_CHECKLIST.md
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const blogDir = path.join(root, 'content', 'blog')

const REQUIRED_QUICK_ANSWER_SLUGS = [
  'best-online-tools-cambridge-ib-marking-courses-2026',
  'best-free-cambridge-revision-resources-2026',
  'best-free-ib-revision-resources-2026',
  'best-cambridge-past-paper-revision-resources-2026',
  'save-my-exams-free-alternative',
  'znotes-free-alternative',
  'how-to-mark-cambridge-past-papers-yourself',
  'ai-marking-cambridge-past-papers-guide',
  'ai-marking-ib-past-papers-guide',
  'ib-diploma-past-papers-guide',
  'ib-free-courses-guide',
  'why-generic-ai-gets-cambridge-marking-wrong-2026',
]

function lacksQuickAnswer(body) {
  return !/^## Quick answer/m.test(body)
}

let failed = 0

for (const slug of REQUIRED_QUICK_ANSWER_SLUGS) {
  const file = path.join(blogDir, `${slug}.md`)
  if (!fs.existsSync(file)) {
    console.error(`MISSING pillar file: ${slug}.md`)
    failed++
    continue
  }
  const body = fs.readFileSync(file, 'utf8')
  if (lacksQuickAnswer(body)) {
    console.error(`MISSING "## Quick answer" in pillar ${slug}.md`)
    failed++
  }
}

let featuredChecked = 0
for (const file of fs.readdirSync(blogDir).filter((f) => f.endsWith('.md'))) {
  const body = fs.readFileSync(path.join(blogDir, file), 'utf8')
  if (!/^featured:\s*true/m.test(body)) continue
  featuredChecked++
  if (lacksQuickAnswer(body)) {
    console.error(`MISSING "## Quick answer" in featured ${file}`)
    failed++
  }
}

if (failed > 0) {
  console.error(`\nseo:quick-answer-lint failed (${failed} issue(s)). See docs/GEO_SYNC_CHECKLIST.md`)
  process.exit(1)
}

console.log(
  `seo:quick-answer-lint OK (${REQUIRED_QUICK_ANSWER_SLUGS.length} pillars, ${featuredChecked} featured)`,
)
