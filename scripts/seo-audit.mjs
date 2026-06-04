#!/usr/bin/env node
/**
 * Technical SEO audit — crawl paths, titles, orphans, cluster coverage.
 * Run: node scripts/seo-audit.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const blogDir = path.join(root, 'content', 'blog')

const STATIC_PATHS = [
  '/',
  '/mark',
  '/subjects',
  '/how-it-works',
  '/pricing',
  '/faq',
  '/about',
  '/contact',
  '/blog',
  '/guides',
  '/guides/past-paper-marking',
  '/guides/mark-schemes',
  '/guides/revision-strategy',
  '/guides/exam-technique',
  '/guides/subject-guides',
  '/guides/subject-choice',
  '/guides/exam-integrity',
  '/guides/resources-tools',
]

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return {}
  const meta = {}
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':')
    if (i === -1) continue
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '')
  }
  return meta
}

const posts = fs
  .readdirSync(blogDir)
  .filter((f) => f.endsWith('.md'))
  .map((f) => {
    const raw = fs.readFileSync(path.join(blogDir, f), 'utf8')
    const meta = parseFrontmatter(raw)
    return {
      slug: f.replace(/\.md$/, ''),
      title: meta.title || '',
      description: meta.description || '',
    }
  })

const blogPaths = posts.map((p) => `/blog/${p.slug}`)
const allIndexable = [...STATIC_PATHS, ...blogPaths]

const issues = []
const warnings = []

for (const p of posts) {
  const titleLen = p.title.length
  if (titleLen > 65) {
    warnings.push(`Title long (${titleLen}): /blog/${p.slug}`)
  }
  if (!p.description || p.description.length < 80) {
    issues.push(`Short/missing meta description: /blog/${p.slug}`)
  }
  if (p.description.length > 165) {
    warnings.push(`Meta description long: /blog/${p.slug}`)
  }
}

const linkedFromFooter = new Set([
  '/',
  '/mark',
  '/subjects',
  '/how-it-works',
  '/pricing',
  '/faq',
  '/about',
  '/contact',
  '/blog',
  '/guides',
  '/guides/past-paper-marking',
  '/guides/mark-schemes',
  '/guides/subject-guides',
  '/guides/exam-integrity',
])

const potentiallyOrphaned = blogPaths.filter((bp) => {
  const slug = bp.replace('/blog/', '')
  return !posts.some((other) => {
    if (other.slug === slug) return false
    const raw = fs.readFileSync(path.join(blogDir, `${other.slug}.md`), 'utf8')
    return raw.includes(`/blog/${slug}`)
  })
})

console.log('=== MarkScheme SEO audit ===\n')
console.log(`Indexable URLs (static + blog): ${allIndexable.length}`)
console.log(`  Static/marketing: ${STATIC_PATHS.length}`)
console.log(`  Blog posts: ${blogPaths.length}\n`)

if (issues.length) {
  console.log('Issues:')
  issues.forEach((i) => console.log('  ✗', i))
  console.log('')
}

if (warnings.length) {
  console.log('Warnings:')
  warnings.slice(0, 15).forEach((w) => console.log('  !', w))
  if (warnings.length > 15) console.log(`  … and ${warnings.length - 15} more`)
  console.log('')
}

console.log(`Blog posts without inbound /blog/ links (hub/footer fixes these): ${potentiallyOrphaned.length}`)
if (potentiallyOrphaned.length > 0 && potentiallyOrphaned.length <= 10) {
  potentiallyOrphaned.forEach((u) => console.log('  ·', u))
}

console.log('\nNext steps:')
console.log('  1. Google Search Console → Coverage + striking-distance queries')
console.log('  2. Rich Results Test on /blog/how-to-mark-cambridge-past-papers-yourself')
console.log('  3. docs/SEO_TWELVE_PILLARS.md + docs/SEO_MEASUREMENT.md')

process.exit(issues.length > 0 ? 1 : 0)
