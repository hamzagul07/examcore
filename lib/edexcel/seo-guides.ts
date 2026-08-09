/**
 * Blog guides that deepen Edexcel shell pages (acquisition → mark).
 * Keep hrefs here so unit/past-paper landers stay config-driven.
 */

const UNIT_GUIDES: Record<string, string> = {
  WMA11: '/blog/edexcel-wma11-pure-mathematics-1-guide-2026',
  WMA12: '/blog/edexcel-wma12-pure-mathematics-2-guide-2026',
  WPH11: '/blog/edexcel-wph11-physics-unit-1-guide-2026',
  WPH12: '/blog/edexcel-wph12-physics-unit-2-guide-2026',
  WCH11: '/blog/edexcel-wch11-chemistry-unit-1-guide-2026',
  WCH12: '/blog/edexcel-wch12-chemistry-unit-2-guide-2026',
  WBI11: '/blog/edexcel-wbi11-biology-unit-1-guide-2026',
}

export const EDEXCEL_IAL_MATHS_UMS_GUIDE =
  '/blog/edexcel-ial-maths-grade-boundaries-ums-2026' as const

export const EDEXCEL_IAL_MATHS_PAST_PAPERS_GUIDE =
  '/blog/edexcel-ial-maths-past-papers-guide-2026' as const

export const EDEXCEL_IAL_MATHS_MARKING_GUIDE =
  '/blog/edexcel-ial-maths-marking-guide-2026' as const

export const EDEXCEL_IAL_PHYSICS_PAST_PAPERS_GUIDE =
  '/blog/edexcel-ial-physics-past-papers-guide-2026' as const

export const EDEXCEL_IAL_CHEMISTRY_MARKING_GUIDE =
  '/blog/edexcel-ial-chemistry-marking-guide-2026' as const

export const EDEXCEL_IAL_CHEMISTRY_PAST_PAPERS_GUIDE =
  '/blog/edexcel-ial-chemistry-past-papers-guide-2026' as const

export const EDEXCEL_IAL_BIOLOGY_GUIDE =
  '/blog/edexcel-ial-biology-guide-2026' as const

/** Hub strip — high-intent guides that convert into /mark?board=edexcel. */
export const EDEXCEL_HUB_GUIDE_LINKS = [
  { href: EDEXCEL_IAL_MATHS_MARKING_GUIDE, label: 'How IAL Maths marking works' },
  { href: EDEXCEL_IAL_MATHS_UMS_GUIDE, label: 'UMS & grade boundaries' },
  { href: EDEXCEL_IAL_PHYSICS_PAST_PAPERS_GUIDE, label: 'IAL Physics past papers' },
  { href: EDEXCEL_IAL_CHEMISTRY_PAST_PAPERS_GUIDE, label: 'IAL Chemistry past papers' },
  { href: EDEXCEL_IAL_CHEMISTRY_MARKING_GUIDE, label: 'IAL Chemistry marking' },
  { href: EDEXCEL_IAL_BIOLOGY_GUIDE, label: 'IAL Biology guide' },
  { href: UNIT_GUIDES.WMA11, label: 'WMA11 Pure 1 guide' },
  { href: UNIT_GUIDES.WMA12, label: 'WMA12 Pure 2 guide' },
  { href: UNIT_GUIDES.WPH11, label: 'WPH11 Physics guide' },
  { href: UNIT_GUIDES.WPH12, label: 'WPH12 Physics Unit 2' },
  { href: UNIT_GUIDES.WCH11, label: 'WCH11 Chemistry guide' },
  { href: UNIT_GUIDES.WCH12, label: 'WCH12 Chemistry Unit 2' },
  { href: UNIT_GUIDES.WBI11, label: 'WBI11 Biology guide' },
] as const

export function edexcelUnitGuideHref(unitCode: string): string | null {
  return UNIT_GUIDES[unitCode.trim().toUpperCase()] ?? null
}

export function edexcelSubjectPastPapersGuideHref(subjectSlug: string): string | null {
  if (subjectSlug === 'mathematics') return EDEXCEL_IAL_MATHS_PAST_PAPERS_GUIDE
  if (subjectSlug === 'physics') return EDEXCEL_IAL_PHYSICS_PAST_PAPERS_GUIDE
  if (subjectSlug === 'chemistry') return EDEXCEL_IAL_CHEMISTRY_PAST_PAPERS_GUIDE
  if (subjectSlug === 'biology') return EDEXCEL_IAL_BIOLOGY_GUIDE
  return null
}
