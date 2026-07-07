#!/usr/bin/env node
/**
 * AI visibility worksheet — fan-out sub-queries to simulate in ChatGPT / Perplexity / GSC AI.
 * Output: docs/generated/ai-visibility-checklist.md
 * When adding GEO targets, also update lib/seo/conversational-queries.ts — see docs/GEO_SYNC_CHECKLIST.md
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const QUERIES = [
  'what online tool checks past paper marks Cambridge and IB',
  'best app to mark a level past papers',
  'best app to mark ib past papers',
  'is MarkScheme legit for cambridge revision',
  'markscheme vs save my exams',
  'markscheme vs revision village ib',
  'how to mark cambridge past papers yourself',
  '9709 past paper marking',
  'cambridge mark scheme B1 M1 A1 explained',
  'mark handwritten maths past paper online',
  'free ib diploma courses online',
  'revision village alternative ib',
  'is markscheme free',
  'markscheme exam room community',
  'markscheme for teachers schools',
  'markscheme press kit facts',
  'markscheme wikidata',
]

const PAGES = [
  'https://markscheme.app/mark',
  'https://markscheme.app/compare',
  'https://markscheme.app/research',
  'https://markscheme.app/changelog',
  'https://markscheme.app/for-teachers',
  'https://markscheme.app/faq',
  'https://markscheme.app/blog/best-online-tools-cambridge-ib-marking-courses-2026',
  'https://markscheme.app/blog/best-free-cambridge-revision-resources-2026',
  'https://markscheme.app/blog/best-free-ib-revision-resources-2026',
  'https://markscheme.app/blog/ai-marking-ib-past-papers-guide',
  'https://markscheme.app/blog/how-to-mark-cambridge-past-papers-yourself',
  'https://markscheme.app/ib/courses',
  'https://markscheme.app/insights',
  'https://markscheme.app/llms.txt',
  'https://www.wikidata.org/wiki/Q140455387',
]

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'generated')
fs.mkdirSync(outDir, { recursive: true })

const lines = [
  '# AI visibility checklist (manual)',
  '',
  'Run monthly. For each sub-query, ask ChatGPT / Perplexity / Google AI Mode:',
  '',
  'See also: [GEO_SYNC_CHECKLIST.md](../GEO_SYNC_CHECKLIST.md)',
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
