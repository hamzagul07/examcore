/**
 * Blog guides that deepen Edexcel shell pages (acquisition → mark).
 * Keep hrefs here so unit/past-paper landers stay config-driven.
 */

const UNIT_GUIDES: Record<string, string> = {
  WMA11: '/blog/edexcel-wma11-pure-mathematics-1-guide-2026',
  WPH11: '/blog/edexcel-wph11-physics-unit-1-guide-2026',
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

/** Hub strip — high-intent guides that convert into /mark?board=edexcel. */
export const EDEXCEL_HUB_GUIDE_LINKS = [
  { href: EDEXCEL_IAL_MATHS_MARKING_GUIDE, label: 'How IAL Maths marking works' },
  { href: EDEXCEL_IAL_MATHS_UMS_GUIDE, label: 'UMS & grade boundaries' },
  { href: EDEXCEL_IAL_PHYSICS_PAST_PAPERS_GUIDE, label: 'IAL Physics past papers' },
  { href: EDEXCEL_IAL_CHEMISTRY_MARKING_GUIDE, label: 'IAL Chemistry marking' },
  { href: UNIT_GUIDES.WMA11, label: 'WMA11 Pure 1 guide' },
  { href: UNIT_GUIDES.WPH11, label: 'WPH11 Physics guide' },
] as const

/** OxfordAQA hub — discovery only (marking still off). */
export const OXFORD_AQA_HUB_GUIDE_LINKS = [
  {
    href: '/blog/edexcel-ial-vs-cambridge-a-level-2026',
    label: 'International boards compared',
  },
  { href: '/edexcel', label: 'Edexcel IAL hub (marking live)' },
  { href: '/results-2026/edexcel', label: 'Results Day — Edexcel path' },
  { href: '/caie', label: 'Cambridge syllabus graph' },
] as const

export function edexcelUnitGuideHref(unitCode: string): string | null {
  return UNIT_GUIDES[unitCode.trim().toUpperCase()] ?? null
}

export function edexcelSubjectPastPapersGuideHref(subjectSlug: string): string | null {
  if (subjectSlug === 'mathematics') return EDEXCEL_IAL_MATHS_PAST_PAPERS_GUIDE
  if (subjectSlug === 'physics') return EDEXCEL_IAL_PHYSICS_PAST_PAPERS_GUIDE
  return null
}
