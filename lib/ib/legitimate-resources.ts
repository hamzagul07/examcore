/**
 * Legitimate free IBDP resources for lesson `resources` sections.
 * Delegates to `lib/ib/resources.ts` — single source of truth with subject pages.
 * @see https://www.ibo.org/programmes/diploma-programme/assessment-and-exams/sample-exam-papers/
 */

import { getIbSubject } from '@/lib/ib/catalog'
import { getIbResources } from '@/lib/ib/resources'

export type IbLegitResource = { label: string; href: string; note?: string }

/** Suggested external links per subject code (`ib-tok`, `ib-biology-hl`, …). */
export function legitResourcesForSubject(subjectCode: string): IbLegitResource[] {
  const slug = subjectCode.replace(/^ib-/, '')
  const subject = getIbSubject(slug)
  if (!subject) {
    return getIbResources({ slug }).map((r) => ({
      label: r.label,
      href: r.href,
      note: r.note,
    }))
  }
  return getIbResources(subject).map((r) => ({
    label: r.label,
    href: r.href,
    note: r.note,
  }))
}

export function formatLegitResourcesForPrompt(subjectCode: string): string {
  return legitResourcesForSubject(subjectCode)
    .map((r) => `- ${r.label}: ${r.href}${r.note ? ` (${r.note})` : ''}`)
    .join('\n')
}

/** Catalog slug (`tok`, `biology-hl`) → marking / content code (`ib-tok`). */
export function ibMarkingCodeFromSlug(slug: string): string {
  return slug.startsWith('ib-') ? slug : `ib-${slug}`
}
