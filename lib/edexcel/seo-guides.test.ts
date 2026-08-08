import {
  EDEXCEL_HUB_GUIDE_LINKS,
  EDEXCEL_IAL_CHEMISTRY_MARKING_GUIDE,
  EDEXCEL_IAL_MATHS_MARKING_GUIDE,
  EDEXCEL_IAL_MATHS_PAST_PAPERS_GUIDE,
  EDEXCEL_IAL_MATHS_UMS_GUIDE,
  EDEXCEL_IAL_PHYSICS_PAST_PAPERS_GUIDE,
  OXFORD_AQA_HUB_GUIDE_LINKS,
  edexcelSubjectPastPapersGuideHref,
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
check('WPH11 guide', edexcelUnitGuideHref('WPH11') === '/blog/edexcel-wph11-physics-unit-1-guide-2026')
check('unknown unit', edexcelUnitGuideHref('WBI11') === null)
check('ums path', EDEXCEL_IAL_MATHS_UMS_GUIDE.includes('grade-boundaries-ums'))
check('past papers path', EDEXCEL_IAL_MATHS_PAST_PAPERS_GUIDE.includes('past-papers-guide'))
check('physics past papers', EDEXCEL_IAL_PHYSICS_PAST_PAPERS_GUIDE.includes('physics-past-papers'))
check('chem marking', EDEXCEL_IAL_CHEMISTRY_MARKING_GUIDE.includes('chemistry-marking'))
check('marking path', EDEXCEL_IAL_MATHS_MARKING_GUIDE.includes('marking-guide'))
check('hub links', EDEXCEL_HUB_GUIDE_LINKS.length >= 6)
check('oxford hub links', OXFORD_AQA_HUB_GUIDE_LINKS.length >= 3)
check(
  'subject past papers maths',
  edexcelSubjectPastPapersGuideHref('mathematics') === EDEXCEL_IAL_MATHS_PAST_PAPERS_GUIDE
)
check(
  'subject past papers physics',
  edexcelSubjectPastPapersGuideHref('physics') === EDEXCEL_IAL_PHYSICS_PAST_PAPERS_GUIDE
)

if (failed > 0) process.exit(1)
console.log('seo-guides.test.ts: all checks passed')
