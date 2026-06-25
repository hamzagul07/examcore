import 'server-only'

import { ibCatalogSlug } from '@/lib/ib/slug-resolve'
import { getBlogPost } from '@/lib/blog'

/** Non-standard blog slugs for IB catalog subjects. */
const PAST_PAPERS_SLUG: Record<string, string> = {
  'environmental-systems-and-societies-sl': 'ib-environmental-systems-and-societies-past-papers-guide',
  'extended-essay': 'ib-extended-essay-complete-guide',
  cas: 'ib-cas-complete-guide',
}

/** Subject slug base → IA guide blog slug (when published). */
const IA_GUIDE_SLUG: Record<string, string> = {
  biology: 'ib-biology-ia-guide',
  chemistry: 'ib-chemistry-ia-guide',
  physics: 'ib-physics-ia-guide',
  economics: 'ib-economics-ia-guide',
  history: 'ib-history-ia-guide',
  geography: 'ib-geography-ia-guide',
  psychology: 'ib-psychology-ia-guide',
  'business-management': 'ib-business-management-ia-guide',
  'computer-science': 'ib-computer-science-ia-guide',
  'environmental-systems-and-societies': 'ib-ess-ia-guide',
  'english-a-lang-lit': 'ib-english-ia-guide',
  'english-a-literature': 'ib-english-ia-guide',
  'maths-aa': 'ib-maths-ia-guide',
  'maths-ai': 'ib-maths-ia-guide',
}

function slugExists(slug: string): boolean {
  return getBlogPost(slug) != null
}

/** Past-papers / revision guide blog for an IB catalog slug, if published. */
export function getIbSubjectPastPapersBlogSlug(catalogSlug: string): string | null {
  const catalog = ibCatalogSlug(catalogSlug)
  const candidates = [
    PAST_PAPERS_SLUG[catalogSlug],
    PAST_PAPERS_SLUG[catalog],
    `ib-${catalog}-past-papers-guide`,
  ].filter((s): s is string => Boolean(s))
  for (const slug of candidates) {
    if (slugExists(slug)) return slug
  }
  return null
}

/** IA guide blog for an IB catalog slug, if published. */
export function getIbSubjectIaBlogSlug(catalogSlug: string): string | null {
  const catalog = ibCatalogSlug(catalogSlug)
  const base = catalog.replace(/-(hl|sl)$/, '')
  if (base === 'tok' || base === 'extended-essay' || base === 'cas') return null
  const candidates = [IA_GUIDE_SLUG[base]].filter((s): s is string => Boolean(s))
  for (const slug of candidates) {
    if (slugExists(slug)) return slug
  }
  return null
}

export type IbSubjectBlogLink = { href: string; label: string }

/** Hub intro links for IB subject / course pages. */
export function getIbSubjectBlogLinks(
  catalogSlug: string,
  shortName: string,
  opts?: { hasCourse?: boolean }
): IbSubjectBlogLink[] {
  const catalog = ibCatalogSlug(catalogSlug)
  const links: IbSubjectBlogLink[] = [
    { href: '/guides/ib', label: 'IB study guide hub' },
    { href: '/blog/ib-markbands-explained', label: 'Markbands explained' },
  ]
  const past = getIbSubjectPastPapersBlogSlug(catalog)
  if (past) {
    links.push({ href: `/blog/${past}`, label: `${shortName} revision guide` })
  }
  const ia = getIbSubjectIaBlogSlug(catalog)
  if (ia) {
    links.push({ href: `/blog/${ia}`, label: 'IA guide' })
  }
  if (opts?.hasCourse) {
    links.push({
      href: `/ib/past-papers/${catalog}#ib-topic-practice`,
      label: 'Topic practice',
    })
  }
  return links
}
