'use client'

import { RevisionHubCard } from '@/components/blog/RevisionHubCard'
import { buildBlogHubCopy, type BlogHubVariant } from '@/lib/blog/revision-hub-copy'
import { getResultsDayPhase } from '@/lib/seo/results-day'
import { hasSyllabusTree } from '@/lib/syllabi'

export type BlogPostCtaExtraAction = {
  href: string
  label: string
}

type BlogPostCtaProps = {
  variant?: BlogHubVariant
  subjectCode?: string | null
  subjectName?: string | null
  slug?: string | null
}

/** End-of-article conversion block — signup-first for information seekers. */
export function BlogPostCta({
  variant = 'default',
  subjectCode = null,
  subjectName = null,
  slug = null,
}: BlogPostCtaProps) {
  const resolvedSlug = slug ?? 'guides'
  const isGradeBoundaries = variant === 'grade-boundaries'
  const isIb = variant === 'ib' || variant === 'ib-ia'
  const isIa = variant === 'ib-ia'
  const resultsPhase = isGradeBoundaries ? getResultsDayPhase() : null
  const showResultsGuide =
    isGradeBoundaries && resultsPhase && resultsPhase !== 'post-igcse'
  const calculatorHref = subjectCode
    ? `/tools/grade-boundary-calculator/${subjectCode}`
    : '/tools/grade-boundary-calculator'
  const hasCourse = Boolean(subjectCode && hasSyllabusTree(subjectCode))
  const courseHref = subjectCode ? `/courses/${subjectCode}` : '/courses'

  const copy = buildBlogHubCopy({
    variant,
    placement: 'footer',
    subjectCode,
    subjectName,
  })

  const extraActions: BlogPostCtaExtraAction[] = []

  if (!isGradeBoundaries) {
    extraActions.push({
      href: subjectCode ? `/mark?subject=${subjectCode}` : '/mark',
      label: isIa || isIb ? 'Criterion marking' : 'Mark a paper free',
    })
    if (variant === 'subject' && hasCourse && subjectCode) {
      extraActions.push({ href: courseHref, label: `Free ${subjectCode} course` })
    }
    if (isIb && !isIa) {
      extraActions.push({
        href: '/ib/past-papers/biology-hl#ib-topic-practice',
        label: 'Topic practice',
      })
    }
  } else if (showResultsGuide) {
    extraActions.push({
      href: '/blog/cambridge-results-day-august-2026-guide',
      label: 'Results day guide',
    })
  }

  return (
    <div className="mt-12">
      <RevisionHubCard
        copy={copy}
        slug={resolvedSlug}
        placement="footer"
        subjectCode={subjectCode}
        subjectGuidesHref={
          subjectCode ? `/subjects/${subjectCode}` : null
        }
        calculatorHref={calculatorHref}
        extraActions={extraActions}
        showFooterMarkAction={false}
      />
    </div>
  )
}
