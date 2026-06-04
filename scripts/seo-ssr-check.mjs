#!/usr/bin/env node
/**
 * SSR check — critical strings must appear in raw HTML (no JS required).
 * Usage: BASE_URL=https://markscheme.app node scripts/seo-ssr-check.mjs
 */
const base = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

const PAGES = [
  { path: '/', must: ['MarkScheme', 'past paper'] },
  { path: '/mark', must: ['mark', 'upload'] },
  { path: '/guides', must: ['Topic hubs', 'guides'] },
  { path: '/subjects/9709', must: ['9709', 'Mathematics'] },
  { path: '/blog/how-to-mark-cambridge-past-papers-yourself', must: ['self-mark', 'mark'] },
  { path: '/compare', must: ['Self-mark', 'MarkScheme'] },
]

let failed = 0
for (const { path, must } of PAGES) {
  const url = `${base}${path}`
  try {
    const res = await fetch(url)
    const html = await res.text()
    const missing = must.filter((s) => !html.toLowerCase().includes(s.toLowerCase()))
    if (res.status !== 200 || missing.length) {
      failed++
      console.log(`✗ ${path} (${res.status})`)
      if (missing.length) console.log(`  missing in HTML: ${missing.join(', ')}`)
    } else {
      console.log(`✓ ${path}`)
    }
  } catch (e) {
    failed++
    console.log(`✗ ${path} — ${e.message}`)
  }
}
process.exit(failed > 0 ? 1 : 0)
