/**
 * Blog → subject/topic-practice internal links.
 *
 * Historically blog posts only linked "up" to a cluster hub and the /mark money
 * page; subject hubs (/subjects/[code]) and IB topic-practice pages received no
 * inbound links from the ~200 subject-specific posts. These helpers close that
 * loop so a syllabus-coded or IB-subject post links directly to its subject page,
 * concentrating internal PageRank on the pages that actually rank for
 * "cambridge 9709", "IB biology past papers", etc.
 */
import { getIbSubjectSlugs } from '@/lib/ib/catalog'
import { isValidMarkingSubjectCode } from '@/lib/seo/programmatic-subjects'

/**
 * A Cambridge blog slug (e.g. `cambridge-9709-…`, `top-9709-past-paper-topics`)
 * → its `/subjects/[code]` hub, but only when a live marking page exists for
 * that code. Years (2026, …) are never valid marking codes, so they're rejected.
 */
export function cambridgeSubjectLinkForSlug(
  slug: string
): { href: string; code: string } | null {
  const match = slug.match(/(?:^|-)(\d{4})(?:-|$)/)
  const code = match?.[1]
  if (!code || !isValidMarkingSubjectCode(code)) return null
  return { href: `/subjects/${code}`, code }
}

// Blog slugs use shorter subject bases than the IB catalogue slugs. Map those
// bases onto a real catalogue subject base so we can resolve a topic-practice URL.
const IB_BLOG_BASE_ALIASES: Record<string, string> = {
  ess: 'environmental-systems-and-societies',
  'english-a': 'english-a-literature',
  sehs: 'sports-exercise-health-science',
}

let cachedBases: string[] | null = null
let cachedSlugSet: Set<string> | null = null

function ibSubjectBases(): { bases: string[]; slugSet: Set<string> } {
  if (!cachedBases || !cachedSlugSet) {
    const slugs = getIbSubjectSlugs()
    cachedSlugSet = new Set(slugs)
    const bases = new Set<string>()
    for (const slug of slugs) bases.add(slug.replace(/-(hl|sl)$/, ''))
    // Longest base first so `maths-aa` wins over any shorter partial.
    cachedBases = [...Object.keys(IB_BLOG_BASE_ALIASES), ...bases].sort(
      (a, b) => b.length - a.length
    )
  }
  return { bases: cachedBases, slugSet: cachedSlugSet }
}

/**
 * An IB blog slug → its subject's topic-practice page. Replaces the previous
 * hardcoded `biology-hl` link that every IB post shared. Returns null for IB
 * posts with no resolvable subject (e.g. `ib-markbands-explained`) so the caller
 * can omit the link rather than point somewhere wrong.
 */
export function ibTopicPracticeLinkForSlug(slug: string): string | null {
  if (!slug.startsWith('ib-')) return null
  const rest = slug.slice(3)
  const { bases, slugSet } = ibSubjectBases()
  for (const base of bases) {
    if (rest !== base && !rest.startsWith(`${base}-`)) continue
    const target = IB_BLOG_BASE_ALIASES[base] ?? base
    const subjectSlug = slugSet.has(`${target}-hl`)
      ? `${target}-hl`
      : slugSet.has(`${target}-sl`)
        ? `${target}-sl`
        : null
    if (subjectSlug) return `/ib/past-papers/${subjectSlug}#ib-topic-practice`
  }
  return null
}
