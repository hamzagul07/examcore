import type { SiteHeaderVariant } from '@/lib/site-nav'

export type SiteHeaderTone = 'hero' | 'learn' | 'discuss' | 'mark' | 'pricing' | 'default'

/** Accent + gradient line per page family. */
export function getSiteHeaderTone(pathname: string): SiteHeaderTone {
  if (pathname === '/') return 'hero'
  if (pathname === '/pricing') return 'pricing'
  if (pathname === '/mark' || pathname.startsWith('/mark/')) return 'mark'
  if (pathname === '/community' || pathname.startsWith('/community/')) return 'discuss'
  if (
    pathname === '/courses' ||
    pathname.startsWith('/courses/') ||
    pathname === '/subjects' ||
    pathname.startsWith('/subjects/') ||
    pathname === '/ib' ||
    pathname.startsWith('/ib/')
  ) {
    return 'learn'
  }
  return 'default'
}

/** Whether the header shell is see-through (nav pill + chips stay frosted). */
export function shouldUseTransparentHeaderShell(
  variant: SiteHeaderVariant,
  tone: SiteHeaderTone
): boolean {
  if (variant === 'app') {
    return tone === 'mark' || tone === 'hero'
  }
  return variant === 'marketing' || variant === 'reading'
}
