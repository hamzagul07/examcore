import type { Metadata } from 'next'

import { createBlogPostMetadata, createPageMetadata } from '@/lib/seo/metadata'
import { formatMetaDescription, formatSerpTitle } from '@/lib/seo/on-page'

/** Short label for SERP titles (drop redundant "Mathematics" → "Maths" where long). */
function compactSubjectLabel(label: string): string {
  return label.replace(/\bMathematics\b/i, 'Maths').trim()
}

/**
 * Titles aligned to GSC head terms: "9702 threshold 2026", "grade threshold a level 2026 may june".
 * Keeps primary keyword before the em dash; formatSerpTitle accounts for the layout brand suffix.
 */
export function thresholdResultsTitle(code: string, label: string): string {
  const short = compactSubjectLabel(label)
  return formatSerpTitle(`${code} Grade Threshold May/June 2026 — ${short}`)
}

export function thresholdResultsDescription(
  code: string,
  label: string,
  level: string
): string {
  return formatMetaDescription(
    `${code} ${label} (${level}) May/June 2026 grade thresholds: check raw marks vs boundaries, Will my grade hold, remarks and free ${code} marking.`
  )
}

export function thresholdResultsKeywords(code: string, label: string): string[] {
  return [
    `${code} threshold 2026`,
    `${code} grade threshold 2026`,
    `${code} may june 2026 threshold`,
    `${code} mj 26 threshold`,
    `${code} grade boundaries 2026`,
    `${code} grade boundaries`,
    `Cambridge ${label} threshold 2026`,
    'grade threshold a level 2026 may june',
    'May June 2026 thresholds',
  ]
}

export function buildResultsCaieMetadata(
  code: string,
  label: string,
  level: string,
  path: string
): Metadata {
  return createPageMetadata({
    title: thresholdResultsTitle(code, label),
    description: thresholdResultsDescription(code, label, level),
    path,
    keywords: thresholdResultsKeywords(code, label),
    ogImagePath: `/api/og/subject/${code}`,
  })
}

export function buildGradeBoundaryCalculatorThresholdMetadata(
  code: string,
  label: string,
  level: string,
  path: string
): Metadata {
  return createPageMetadata({
    ogImagePath: '/api/og/tools/grade-boundary-calculator',
    title: formatSerpTitle(`${code} Grade Threshold 2026 — raw mark calculator`),
    description: formatMetaDescription(
      `Convert ${code} ${label} (${level}) raw marks using May/June 2026 Cambridge grade thresholds. See your grade and marks to the next boundary.`
    ),
    path,
    keywords: [
      ...thresholdResultsKeywords(code, label),
      `${code} grade calculator`,
      `${code} raw marks to grade`,
    ],
  })
}

export function buildGradeBoundaryBlogMetadata(
  post: {
    title: string
    description: string
    slug: string
    date: string
    keywords: string[]
    updated?: string
  },
  code: string,
  label: string,
  level: string
): Metadata {
  const serpTitle = formatSerpTitle(`${code} Grade Threshold May/June 2026`)
  return createBlogPostMetadata({
    ...post,
    title: serpTitle,
    description: thresholdResultsDescription(code, label, level),
    keywords: [...new Set([...post.keywords, ...thresholdResultsKeywords(code, label)])],
  })
}

/** Hub page — matches "grade threshold a level 2026 may june" cluster. */
export function gradeBoundariesHubTitle(): string {
  return formatSerpTitle(
    'Grade Threshold 2026 May/June — Cambridge A-Level & IGCSE'
  )
}
