/**
 * One-off: tighten blog meta descriptions to the SERP sweet spot (~120–158 chars).
 * Only the frontmatter `description:` line is touched — bodies are never modified.
 *
 *   node scripts/fix-blog-descriptions.mjs          # dry run (report only)
 *   node scripts/fix-blog-descriptions.mjs --write   # apply
 *
 * Strategy:
 *  - LONG (>160): the per-subject guide template shares a fixed tail, swapped
 *    deterministically. Any other long post is reported for manual/AI editing
 *    (we never blind-truncate a comma list mid-phrase).
 *  - SHORT (<120): reported only. Expansion is deferred to the AI content batch
 *    so we don't append redundant/awkward filler.
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'

const WRITE = process.argv.includes('--write')
const DIR = join(process.cwd(), 'content', 'blog')

// Subject-guide template tail → tightened equivalent (keeps the revision-plan signal).
const LONG_TAIL = 'revision plan, and marking your answers with MarkScheme.'
const LONG_TAIL_FIX = 'and a revision plan.'

const files = readdirSync(DIR).filter((f) => f.endsWith('.md'))
const fixed = []
const manualLong = []
const short = []

for (const f of files) {
  const slug = f.replace(/\.md$/, '')
  const raw = readFileSync(join(DIR, f), 'utf8')
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) continue
  const fm = m[1]
  const dLine = fm.split(/\r?\n/).find((l) => l.startsWith('description:'))
  if (!dLine) continue
  const desc = dLine.slice('description:'.length).trim().replace(/^["']|["']$/g, '')

  if (desc.length > 160) {
    if (desc.includes(LONG_TAIL)) {
      const next = desc.replace(LONG_TAIL, LONG_TAIL_FIX)
      const newLine = `description: ${next}`
      if (WRITE) writeFileSync(join(DIR, f), raw.replace(dLine, newLine))
      fixed.push([slug, desc.length, next.length])
    } else {
      manualLong.push([slug, desc.length])
    }
  } else if (desc.length < 120) {
    short.push([slug, desc.length])
  }
}

console.log(`\n${WRITE ? 'APPLIED' : 'DRY RUN'} — template-tightened: ${fixed.length}`)
fixed.forEach(([s, a, b]) => console.log(`  ${a}→${b}  ${s}`))
console.log(`\nLONG needing manual/AI trim: ${manualLong.length}`)
manualLong.sort((a, b) => b[1] - a[1]).forEach(([s, n]) => console.log(`  ${n}  ${s}`))
console.log(`\nSHORT (<120) deferred to AI batch: ${short.length}`)
