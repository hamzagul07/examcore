#!/usr/bin/env node
/**
 * AI visibility worksheet — fan-out sub-queries to simulate in ChatGPT / Perplexity / GSC AI.
 * Output: docs/generated/ai-visibility-checklist.md (gitignored optional)
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const QUERIES = [
  'how to mark cambridge past papers yourself',
  'best app to mark a level past papers',
  '9709 past paper marking',
  'cambridge mark scheme B1 M1 A1 explained',
  'is MarkScheme legit for cambridge revision',
  'cambridge exam leaks 2026 what should students do',
  'mark handwritten maths past paper online',
]

const PAGES = [
  'https://markscheme.app/mark',
  'https://markscheme.app/blog/how-to-mark-cambridge-past-papers-yourself',
  'https://markscheme.app/subjects/9709',
  'https://markscheme.app/insights',
  'https://markscheme.app/compare',
]

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'generated')
fs.mkdirSync(outDir, { recursive: true })

const lines = [
  '# AI visibility checklist (manual)',
  '',
  'Run monthly. For each sub-query, ask ChatGPT / Perplexity / Google AI Mode:',
  '',
  '| Sub-query | MarkScheme cited? | URL cited | Competitor cited instead |',
  '|-----------|-------------------|-----------|---------------------------|',
  ...QUERIES.map((q) => `| ${q} | ☐ | | |`),
  '',
  '## Pages to verify in answers',
  ...PAGES.map((p) => `- ${p}`),
  '',
  '## Fan-out simulation',
  'For head query, note 10–15 sub-questions the AI asks internally; add missing ones to `lib/seo/conversational-queries.ts`.',
  '',
]

const outPath = path.join(outDir, 'ai-visibility-checklist.md')
fs.writeFileSync(outPath, lines.join('\n'))
console.log(`Wrote ${outPath}`)
