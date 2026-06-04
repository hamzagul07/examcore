#!/usr/bin/env node
/**
 * Sitewide quality — pages to noindex/consolidate (Helpful Content defense).
 */
const CANDIDATES_NOINDEX = [
  { path: '/join', reason: 'Low organic intent; utility only' },
  { path: '/auth/signin', reason: 'Already in robots disallow' },
  { path: '/auth/signup', reason: 'Thin auth; disallow' },
]

const KEEP_MONEY = ['/', '/mark', '/pricing', '/subjects', '/guides', '/blog', '/insights', '/compare']

console.log('=== Sitewide quality review ===\n')
console.log('Protect (concentrate internal links here):')
KEEP_MONEY.forEach((p) => console.log(`  ✓ ${p}`))

console.log('\nConsider noindex or no internal links (already blocked in robots where noted):')
CANDIDATES_NOINDEX.forEach((c) => console.log(`  · ${c.path} — ${c.reason}`))

console.log('\nAction: Do not add footer links to low-value paths.')
console.log('Run pnpm seo:decay to refresh stale blog posts.')
