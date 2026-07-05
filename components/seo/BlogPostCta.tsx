import Link from 'next/link'
import { ArrowRight, MessageCircle, Sparkles } from 'lucide-react'
import { buildSignUpHref } from '@/lib/auth-redirect'
import { getResultsDayPhase } from '@/lib/seo/results-day'
import { hasSyllabusTree } from '@/lib/syllabi'

type BlogPostCtaProps = {
  variant?: 'default' | 'subject' | 'ib' | 'ib-ia' | 'grade-boundaries'
  subjectCode?: string | null
  subjectName?: string | null
  slug?: string | null
}

/** End-of-article conversion — signup + exam discussion, user-friendly layout. */
export function BlogPostCta({
  variant = 'default',
  subjectCode = null,
  subjectName = null,
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
  const communityHref = subjectCode ? `/community/s/${subjectCode}` : '/community'
  const roomLabel = subjectCode
    ? subjectName
      ? `${subjectCode} ${subjectName}`
      : subjectCode
    : 'exam season'

  return (
    <aside className="ec-blog-footer-cta mt-12">
      <div className="ec-blog-footer-cta__inner">
        <div className="ec-blog-footer-cta__copy">
          <p className="ms-overline">Keep learning</p>
          <h2 className="ec-blog-footer-cta__title">
            Save your subjects — join the conversation
          </h2>
          <p className="ec-blog-footer-cta__lead">
            Free account brings you back to this guide anytime. Or jump into{' '}
            <strong className="font-semibold text-[var(--ec-text-primary)]">{roomLabel}</strong>{' '}
            discussions — browse free, post when you&apos;re ready.
          </p>
          <p className="ec-blog-footer-cta__trust">
            <Sparkles className="inline h-3.5 w-3.5 align-text-bottom" aria-hidden />
            {' '}
            No card required · Scholar &amp; Max trial on pricing
          </p>
        </div>

        <div className="ec-blog-footer-cta__actions">
          <div className="ec-blog-footer-cta__discuss">
            <div className="ec-blog-footer-cta__discuss-meta">
              <div className="ec-discuss-live" aria-hidden>
                <span className="ec-discuss-live__dot" />
                Live now
              </div>
              <div className="ec-discuss-avatars" aria-hidden>
                <span className="ec-discuss-avatars__bubble ec-discuss-avatars__bubble--a">A</span>
                <span className="ec-discuss-avatars__bubble ec-discuss-avatars__bubble--b">M</span>
                <span className="ec-discuss-avatars__bubble ec-discuss-avatars__bubble--c">S</span>
                <span className="ec-discuss-avatars__more">+12</span>
              </div>
            </div>
            <p className="ec-blog-footer-cta__discuss-label">Exam discussion</p>
            <Link href={communityHref} className="ec-btn-discuss">
              <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
              Discuss with other students
              <ArrowRight className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            </Link>
          </div>

          <Link
            href={signupHref}
            className="ec-btn-primary ec-blog-footer-cta__signup min-h-[48px] w-full justify-center"
          >
            Create free account
          </Link>

          <div className="ec-blog-footer-cta__secondary">
            {isGradeBoundaries ? (
              <Link href={calculatorHref} className="ec-btn-ghost min-h-[44px] flex-1 justify-center">
                Grade calculator
              </Link>
            ) : null}
            {!isGradeBoundaries ? (
              <Link
                href={subjectCode ? `/mark?subject=${subjectCode}` : '/mark'}
                className="ec-btn-ghost min-h-[44px] flex-1 justify-center"
              >
                Mark a paper free
              </Link>
            ) : null}
            {variant === 'subject' && hasCourse ? (
              <Link href={courseHref} className="ec-btn-ghost min-h-[44px] flex-1 justify-center">
                Free {subjectCode} course
              </Link>
            ) : null}
            {showResultsGuide ? (
              <Link
                href="/blog/cambridge-results-day-august-2026-guide"
                className="ec-btn-ghost min-h-[44px] flex-1 justify-center"
              >
                Results day guide
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  )
}
