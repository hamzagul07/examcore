#!/usr/bin/env node
/**
 * SSR check — critical strings and crawl signals must appear in raw HTML (no JS).
 * Usage: BASE_URL=https://markscheme.app node scripts/seo-ssr-check.mjs
 */
const base = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

const PAGES = [
  { path: '/', must: ['MarkScheme', 'past paper'], h1Min: 1, h1Max: 1 },
  { path: '/mark', must: ['mark', 'upload'], h1Min: 1, h1Max: 1 },
  { path: '/courses', must: ['Free courses'], h1Min: 1, h1Max: 1 },
  { path: '/subjects', must: ['Cambridge'], h1Min: 1, h1Max: 1 },
  { path: '/community', must: ['Exam Room'], h1Min: 1, h1Max: 1 },
  { path: '/guides', must: ['Topic hubs', 'guides'], h1Min: 1, h1Max: 1 },
  { path: '/guides/ib', must: ['IB'], h1Min: 1, h1Max: 1 },
  { path: '/how-it-works', must: ['mark'], h1Min: 1, h1Max: 1 },
  { path: '/auth/signup', must: ['account'], h1Min: 1, h1Max: 1 },
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
  { path: '/blog/how-to-mark-cambridge-past-papers-yourself', must: ['self-mark', 'mark'], h1Min: 1, h1Max: 1 },
  { path: '/compare', must: ['Self-mark', 'MarkScheme'], h1Min: 1, h1Max: 1 },
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

    const problems = []
    if (res.status !== 200) problems.push(`status ${res.status}`)
    if (missing.length) problems.push(`missing: ${missing.join(', ')}`)
    if (h1 < h1Min) problems.push(`h1=${h1} (need >=${h1Min})`)
    if (h1 > h1Max) problems.push(`h1=${h1} (need <=${h1Max})`)
    if (refresh) problems.push('meta refresh')
    if (!hasDesc) problems.push('missing meta description')

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
