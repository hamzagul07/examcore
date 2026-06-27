import Link from 'next/link'
import { buildSignUpHref } from '@/lib/auth-redirect'
import { getResultsDayPhase } from '@/lib/seo/results-day'
import { hasSyllabusTree } from '@/lib/syllabi'

type BlogPostCtaProps = {
  variant?: 'default' | 'subject' | 'ib' | 'ib-ia' | 'grade-boundaries'
  subjectCode?: string | null
  slug?: string | null
}

/** End-of-article conversion — compact signup block with exam discussion angle. */
export function BlogPostCta({
  variant = 'default',
  subjectCode = null,
  slug = null,
}: BlogPostCtaProps) {
  const isGradeBoundaries = variant === 'grade-boundaries'
  const resultsPhase = isGradeBoundaries ? getResultsDayPhase() : null
  const showResultsGuide =
    isGradeBoundaries && resultsPhase && resultsPhase !== 'post-igcse'
  const calculatorHref = subjectCode
    ? `/tools/grade-boundary-calculator/${subjectCode}`
    : '/tools/grade-boundary-calculator'
  const hasCourse = Boolean(subjectCode && hasSyllabusTree(subjectCode))
  const courseHref = subjectCode ? `/courses/${subjectCode}` : '/courses'
  const signupHref = slug ? buildSignUpHref(`/blog/${slug}`) : buildSignUpHref('/blog')
  const communityHref = subjectCode ? `/community?subject=${subjectCode}` : '/community'
  const discussionLabel = subjectCode ? `${subjectCode} discussions` : 'exam discussions'

  return (
    <aside className="ms-blog-cta-block mt-12">
      <p className="ms-overline">Keep learning</p>
      <h2 className="ms-h3" style={{ marginTop: 8 }}>
        Sign up — continue guides &amp; join {discussionLabel}
      </h2>
      <p className="ms-body-2" style={{ marginTop: 12 }}>
        Free account: save your subjects, return to this guide anytime, and read what other
        students ask in{' '}
        <Link href={communityHref} className="ec-link font-semibold">
          {discussionLabel}
        </Link>
        . Marking and courses when you&apos;re ready — no card to start.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={signupHref}
          className="ec-btn-primary inline-flex min-h-[48px] justify-center"
        >
          Create free account
        </Link>
        <Link
          href={communityHref}
          className="ec-btn-secondary inline-flex min-h-[48px] justify-center"
        >
          Browse {discussionLabel}
        </Link>
        {isGradeBoundaries ? (
          <Link
            href={calculatorHref}
            className="ec-btn-ghost inline-flex min-h-[48px] justify-center"
          >
            Grade calculator
          </Link>
        ) : null}
        {!isGradeBoundaries ? (
          <Link
            href={subjectCode ? `/mark?subject=${subjectCode}` : '/mark'}
            className="ec-btn-ghost inline-flex min-h-[48px] justify-center"
          >
            Mark a paper free
          </Link>
        ) : null}
        {variant === 'subject' && hasCourse ? (
          <Link href={courseHref} className="ec-btn-ghost inline-flex min-h-[48px] justify-center">
            Free {subjectCode} course
          </Link>
        ) : null}
        {showResultsGuide ? (
          <Link
            href="/blog/cambridge-results-day-august-2026-guide"
            className="ec-btn-ghost inline-flex min-h-[48px] justify-center"
          >
            Results day guide
          </Link>
        ) : null}
      </div>
    </aside>
  )
}
