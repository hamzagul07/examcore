#!/usr/bin/env node
/**
 * SSR check — critical strings and crawl signals must appear in raw HTML (no JS).
 * Usage: BASE_URL=https://markscheme.app node scripts/seo-ssr-check.mjs
 */
const base = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

const PAGES = [
  { path: '/', must: ['MarkScheme', 'second-pass', 'markscheme.app'], h1Min: 1, h1Max: 1 },
  {
    path: '/mark',
    must: ['IB', 'second pass', 'markscheme.app', 'Common questions'],
    h1Min: 1,
    h1Max: 1,
  },
  { path: '/courses', must: ['Free courses', 'IB'], h1Min: 1, h1Max: 1 },
  { path: '/subjects', must: ['Cambridge'], h1Min: 1, h1Max: 1 },
  { path: '/community', must: ['Exam Room'], h1Min: 1, h1Max: 1 },
  { path: '/guides', must: ['Topic hubs', 'guides'], h1Min: 1, h1Max: 1 },
  { path: '/guides/ib', must: ['IB'], h1Min: 1, h1Max: 1 },
  { path: '/how-it-works', must: ['second-pass', 'mark'], h1Min: 1, h1Max: 1 },
  { path: '/about', must: ['MarkScheme', 'second-pass', 'markscheme.app'], h1Min: 1, h1Max: 1 },
  { path: '/faq', must: ['Cambridge', 'IB', 'Quick answers'], h1Min: 1, h1Max: 2 },
  { path: '/for-teachers', must: ['teacher', 'classroom', 'markscheme.app'], h1Min: 1, h1Max: 1 },
  { path: '/changelog', must: ['MarkScheme', 'marking', 'Quick answer'], h1Min: 1, h1Max: 1 },
  { path: '/llms.txt', must: ['Common questions', 'for-teachers', 'markscheme.app'], h1Min: 0, h1Max: 0 },
  { path: '/subjects/9709', must: ['9709', 'Mathematics'], h1Min: 1, h1Max: 1 },
  {
    path: '/past-papers/9700/cells-as-the-basic-units-of-living-organisms',
    must: ['9700', 'cells'],
    h1Min: 1,
    h1Max: 1,
  },
  {
    path: '/courses/9706/3-1-2-partnerships',
    must: ['9706', 'Partnership'],
    h1Min: 1,
    h1Max: 1,
  },
  { path: '/blog/how-to-mark-cambridge-past-papers-yourself', must: ['Quick answer', 'mark'], h1Min: 1, h1Max: 1 },
  {
    path: '/blog/best-online-tools-cambridge-ib-marking-courses-2026',
    must: ['Quick answer', 'MarkScheme'],
    h1Min: 1,
    h1Max: 1,
  },
  { path: '/compare', must: ['Save My Exams', 'MarkScheme', 'Frequently asked'], h1Min: 1, h1Max: 1 },
  { path: '/research', must: ['Press', 'markscheme.app', 'second-pass'], h1Min: 1, h1Max: 1 },
  { path: '/insights', must: ['self-mark', 'markband', 'Quick answer'], h1Min: 1, h1Max: 1 },
  { path: '/contact', must: ['hello@markscheme.app', 'schools', 'press'], h1Min: 1, h1Max: 1 },
  { path: '/ib/courses', must: ['IB', 'course'], h1Min: 1, h1Max: 1 },
]

let failed = 0
for (const { path, must, h1Min = 1, h1Max = 1 } of PAGES) {
  const url = `${base}${path}`
  try {
    const res = await fetch(url)
    const html = await res.text()
    const missing = must.filter((s) => !html.toLowerCase().includes(s.toLowerCase()))
    const h1 = (html.match(/<h1[\s>]/gi) || []).length
    const refresh = /http-equiv=["']refresh["']/i.test(html)
    const hasDesc = /<meta[^>]+name=["']description["']/i.test(html)
    const hasFaqLd = /FAQPage/i.test(html)

    const problems = []
    if (res.status !== 200) problems.push(`status ${res.status}`)
    if (missing.length) problems.push(`missing: ${missing.join(', ')}`)
    if (h1 < h1Min) problems.push(`h1=${h1} (need >=${h1Min})`)
    if (h1 > h1Max) problems.push(`h1=${h1} (need <=${h1Max})`)
    if (refresh) problems.push('meta refresh')
    if (!hasDesc) problems.push('missing meta description')
    if (path === '/mark' && !hasFaqLd) problems.push('missing FAQPage JSON-LD')

    if (problems.length) {
      failed++
      console.log(`✗ ${path}`)
      problems.forEach((p) => console.log(`  ${p}`))
    } else {
      console.log(`✓ ${path} (h1=${h1}, ${Math.round(Buffer.byteLength(html) / 1024)}KB)`)
    }
  } catch (e) {
    failed++
    console.log(`✗ ${path} — ${e.message}`)
  }
}
process.exit(failed > 0 ? 1 : 0)
