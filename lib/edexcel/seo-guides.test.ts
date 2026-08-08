import {
  EDEXCEL_IAL_MATHS_PAST_PAPERS_GUIDE,
  EDEXCEL_IAL_MATHS_UMS_GUIDE,
  edexcelUnitGuideHref,
} from '@/lib/edexcel/seo-guides'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

check('WMA11 guide', edexcelUnitGuideHref('wma11') === '/blog/edexcel-wma11-pure-mathematics-1-guide-2026')
check('unknown unit', edexcelUnitGuideHref('WPH11') === null)
check('ums path', EDEXCEL_IAL_MATHS_UMS_GUIDE.includes('grade-boundaries-ums'))
check('past papers path', EDEXCEL_IAL_MATHS_PAST_PAPERS_GUIDE.includes('past-papers-guide'))

if (failed > 0) process.exit(1)
console.log('seo-guides.test.ts: all checks passed')
