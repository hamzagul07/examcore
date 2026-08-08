import {
  markBoardFromBlogSlug,
  markHrefForBlogSlug,
  showEdexcelBridgeForBlogSlug,
} from '@/lib/seo/blog-mark-href'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

check('ib slug', markBoardFromBlogSlug('ib-biology-hl-past-papers') === 'ib')
check(
  'edexcel ial slug',
  markBoardFromBlogSlug('edexcel-ial-vs-cambridge-a-level-2026') === 'edexcel'
)
check(
  'cambridge vs edexcel',
  markBoardFromBlogSlug('cambridge-vs-edexcel-vs-aqa') === 'edexcel'
)
check('cambridge maths', markBoardFromBlogSlug('cambridge-9709-guide') === 'cambridge')
check(
  'edexcel mark href',
  markHrefForBlogSlug('edexcel-ial-vs-cambridge-a-level-2026') ===
    '/mark?board=edexcel&subject=WMA11'
)
check(
  'cambridge mark href keeps code',
  markHrefForBlogSlug('cambridge-9709-guide', '9709') ===
    '/mark?board=cambridge&subject=9709'
)
check(
  'bridge on cambridge boundaries',
  showEdexcelBridgeForBlogSlug(
    'cambridge-9709-mathematics-grade-boundaries-2026'
  ) === true
)
check(
  'bridge on results day',
  showEdexcelBridgeForBlogSlug('cambridge-results-day-august-2026-guide') ===
    true
)
check(
  'no bridge on plain cambridge guide',
  showEdexcelBridgeForBlogSlug('cambridge-9709-guide') === false
)
check(
  'no bridge when slug already edexcel',
  showEdexcelBridgeForBlogSlug('edexcel-ial-vs-cambridge-a-level-2026') ===
    false
)

if (failed > 0) process.exit(1)
console.log('blog-mark-href.test.ts: all checks passed')
