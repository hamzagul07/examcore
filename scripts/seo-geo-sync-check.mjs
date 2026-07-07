#!/usr/bin/env node
/**
 * Lightweight GEO sync checks ÿ llms.txt mentions money pages & head terms.
 * See docs/GEO_SYNC_CHECKLIST.md
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const llmsPath = path.join(root, 'public', 'llms.txt')
const llms = fs.readFileSync(llmsPath, 'utf8')

const REQUIRED_SUBSTRINGS = [
  'markscheme.app/mark',
  '/ib/courses',
  '/courses',
  '/compare',
  '/research',
  '/insights',
  '/community',
  '/for-teachers',
  '/changelog',
  'Cambridge and IB',
  'best-online-tools-cambridge-ib-marking-courses-2026',
  'best-free-ib-revision-resources-2026',
  'ai-marking-ib-past-papers-guide',
  'online tool',
  'IB markbands',
  'Exam Room',
  'second-pass',
  '## Common questions (GEO)',
]

const REQUIRED_QA_SNIPPETS = [
  'What is the best online tool to check past-paper marks',
  'Can I mark IB past papers online with markbands',
  'Is MarkScheme free?',
  'Is there a MarkScheme for teachers and schools?',
]

let failed = 0
for (const needle of REQUIRED_SUBSTRINGS) {
  if (!llms.includes(needle)) {
    console.error(`llms.txt missing: ${needle}`)
    failed++
  }
}

for (const needle of REQUIRED_QA_SNIPPETS) {
  if (!llms.includes(needle)) {
    console.error(`llms.txt missing Q&A: ${needle}`)
    failed++
  }
}

const entity = fs.readFileSync(path.join(root, 'lib', 'seo', 'entity.ts'), 'utf8')
if (!entity.includes('IB Diploma') || !entity.includes('Exam Room')) {
  console.error('lib/seo/entity.ts BRAND_ENTITY missing IB Diploma or Exam Room')
  failed++
}

const markSeo = fs.readFileSync(path.join(root, 'lib', 'seo', 'mark-seo.ts'), 'utf8')
if (!markSeo.includes('second-pass') && !markSeo.includes('second pass')) {
  console.error('lib/seo/mark-seo.ts missing second-pass copy')
  failed++
}

const geoQaSrc = fs.readFileSync(path.join(root, 'lib', 'seo', 'llms-geo-qa.ts'), 'utf8')
const geoQuestions = [...geoQaSrc.matchAll(/\bq: '([^']+)'/g)].map((m) => m[1])
for (const q of geoQuestions) {
  if (!llms.includes(q)) {
    console.error(`llms.txt missing GEO_QA question from llms-geo-qa.ts: ${q.slice(0, 60)}ÿ`)
    failed++
  }
}

if (!fs.existsSync(path.join(root, 'lib', 'seo', 'llms-geo-qa.ts'))) {
  console.error('missing lib/seo/llms-geo-qa.ts')
  failed++
}

if (failed > 0) {
  console.error(`\nseo:geo-sync-check failed (${failed} issue(s))`)
  process.exit(1)
}

console.log('seo:geo-sync-check OK')
