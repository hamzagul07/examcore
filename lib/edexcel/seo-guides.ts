/**
 * Blog guides that deepen Edexcel shell pages (acquisition → mark).
 * Keep hrefs here so unit/past-paper landers stay config-driven.
 */

const UNIT_GUIDES: Record<string, string> = {
  WMA11: '/blog/edexcel-wma11-pure-mathematics-1-guide-2026',
}

export const EDEXCEL_IAL_MATHS_UMS_GUIDE =
  '/blog/edexcel-ial-maths-grade-boundaries-ums-2026' as const

export const EDEXCEL_IAL_MATHS_PAST_PAPERS_GUIDE =
  '/blog/edexcel-ial-maths-past-papers-guide-2026' as const

export const EDEXCEL_IAL_MATHS_MARKING_GUIDE =
  '/blog/edexcel-ial-maths-marking-guide-2026' as const

/** Hub strip — high-intent guides that convert into /mark?board=edexcel. */
export const EDEXCEL_HUB_GUIDE_LINKS = [
  { href: EDEXCEL_IAL_MATHS_MARKING_GUIDE, label: 'How IAL Maths marking works' },
  { href: EDEXCEL_IAL_MATHS_UMS_GUIDE, label: 'UMS & grade boundaries' },
  { href: EDEXCEL_IAL_MATHS_PAST_PAPERS_GUIDE, label: 'Past papers practice loop' },
  { href: UNIT_GUIDES.WMA11, label: 'WMA11 Pure 1 guide' },
] as const

export function edexcelUnitGuideHref(unitCode: string): string | null {
  return UNIT_GUIDES[unitCode.trim().toUpperCase()] ?? null
}
