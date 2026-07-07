#!/usr/bin/env node
/**
 * Lightweight GEO sync checks - llms.txt mentions money pages & head terms.
 * See docs/GEO_SYNC_CHECKLIST.md
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const UTF8_GEO_FILES = [
  'lib/seo/llms-geo-qa.ts',
  'lib/seo/llms-document.ts',
  'lib/seo/entity.ts',
  'lib/seo/mark-seo.ts',
  'lib/seo/landing-faq.ts',
]

function assertValidUtf8(relPath) {
  const fp = path.join(root, relPath)
  const data = fs.readFileSync(fp)
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(data)
  } catch (e) {
    console.error(`${relPath}: invalid UTF-8 (${e.message})`)
    return 1
  }
  if (data.includes(0x97)) {
    console.error(`${relPath}: cp1252 em-dash byte 0x97 - convert to UTF-8 em-dash`)
    return 1
  }
  return 0
}

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
  'best-free-cambridge-revision-resources-2026',
  'best-free-ib-revision-resources-2026',
  'ai-marking-ib-past-papers-guide',
  'online tool',
  'IB markbands',
  'Exam Room',
  'second-pass',
  'wikidata.org/wiki/Q140455387',
  '## Common questions (GEO)',
]

const REQUIRED_QA_SNIPPETS = [
  'What is the best online tool to check past-paper marks',
  'Can I mark IB past papers online with markbands',
  'Is MarkScheme free?',
  'Is there a MarkScheme for teachers and schools?',
]

let failed = 0
for (const rel of UTF8_GEO_FILES) {
  failed += assertValidUtf8(rel)
}

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
if (!entity.includes('IB Diploma') || !entity.includes('Exam Room') || !entity.includes('Q140455387')) {
  console.error('lib/seo/entity.ts missing IB Diploma, Exam Room, or Wikidata default')
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
    console.error(`llms.txt missing GEO_QA question from llms-geo-qa.ts: ${q.slice(0, 60)}?`)
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
