'use client'

import {
  CTA_MARK_PAPER,
  markCtaLabel as buildMarkCtaLabel,
} from '@/lib/copy/product-lexicon'
import Link from 'next/link'
import { buildSignUpHref } from '@/lib/auth-redirect'
import { trackFunnelEvent } from '@/lib/analytics/funnel'
import {
  EDEXCEL_UMS_HREF,
  markBoardFromBlogSlug,
  markHrefForBlogSlug,
  showEdexcelBridgeForBlogSlug,
} from '@/lib/seo/blog-mark-href'
import { edexcelMarkHref } from '@/lib/edexcel/marking'
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
  const gradeHoldHref = subjectCode
    ? `/tools/will-my-grade-hold?code=${encodeURIComponent(subjectCode)}`
    : '/tools/will-my-grade-hold'
  const hasCourse = Boolean(subjectCode && hasSyllabusTree(subjectCode))
  const courseHref = subjectCode ? `/courses/${subjectCode}` : '/courses'
  const signupHref = slug ? buildSignUpHref(`/blog/${slug}`) : buildSignUpHref('/blog')
  const markBoard = slug ? markBoardFromBlogSlug(slug) : 'cambridge'
  const markHref = slug
    ? markHrefForBlogSlug(slug, subjectCode)
    : subjectCode
      ? `/mark?subject=${encodeURIComponent(subjectCode)}`
      : '/mark'
  const communityHref = subjectCode ? `/community/s/${subjectCode}` : '/community'
  const roomLabel =
    markBoard === 'edexcel'
      ? 'Edexcel IAL'
      : subjectCode
        ? subjectName
          ? `${subjectCode} ${subjectName}`
          : subjectCode
        : 'exam season'
  // Qualified where we know the board or subject, canonical where we don't.
  // The unqualified case used to append ", no account", which made it a sixth
  // phrasing of the same button — the "no account" promise already lives in the
  // hero micro line and the body copy below.
  const markCtaLabel =
    markBoard === 'edexcel'
      ? buildMarkCtaLabel('Edexcel IAL')
      : buildMarkCtaLabel(subjectCode)
  const showEdexcelBridge = showEdexcelBridgeForBlogSlug(slug)
  const edexcelMarkCta = edexcelMarkHref('WMA11')

  return (
    <aside className="ec-blog-footer-cta mt-12">
      <div className="ec-blog-footer-cta__inner">
        <div className="ec-blog-footer-cta__copy">
          <p className="ms-overline">Keep learning</p>
          <h2 className="ec-blog-footer-cta__title">
            {isGradeBoundaries
              ? 'Will your grade hold — then mark the gap'
              : subjectCode
                ? `Mark a ${subjectCode} question against the real scheme`
                : 'Mark a question — then join the conversation'}
          </h2>
          <p className="ec-blog-footer-cta__lead">
            {isGradeBoundaries
              ? 'Stress-test your raw mark against May/June thresholds, then practise the topics that decide the next grade. Free account saves your subjects for mock season.'
              : (
                <>
                  Type or photograph one answer — free, no account. Or jump into{' '}
                  <strong className="font-semibold text-[var(--ec-text-primary)]">{roomLabel}</strong>{' '}
                  discussions when you&apos;re ready.
                </>
              )}
          </p>
          {showEdexcelBridge ? (
            <p className="ec-blog-footer-cta__lead" style={{ marginTop: 10 }}>
              Sitting Edexcel International instead? Boundaries use UMS / cash-in
              — see the{' '}
              <Link href={EDEXCEL_UMS_HREF} className="ec-btn-underline">
                IAL UMS explainer
              </Link>{' '}
              or{' '}
              <Link
                href={edexcelMarkCta}
                className="ec-btn-underline"
                onClick={() =>
                  trackFunnelEvent('mark_cta_clicked', {
                    source: 'blog_footer_edexcel_bridge',
                    subject: 'WMA11',
                    board: 'edexcel',
                  })
                }
              >
                mark WMA11 free
              </Link>
              .
            </p>
          ) : null}
          <p className="ec-blog-footer-cta__trust">
            <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
              ✓
            </span>{' '}
            No card required · Free plan, no expiry
          </p>
        </div>

        <div className="ec-blog-footer-cta__actions">
          <div className="ec-blog-footer-cta__discuss">
            <div className="ec-blog-footer-cta__discuss-meta">
              <div className="ec-discuss-live" aria-hidden>
                <span className="ec-discuss-live__dot" />
                Live now
              </div>
              <div className="ec-discuss-room-stamp" aria-hidden>
                <span className="ec-discuss-room-stamp__hash">#</span>
                <span className="ec-discuss-room-stamp__label">Exam Room</span>
              </div>
            </div>
            <p className="ec-blog-footer-cta__discuss-label">Exam discussion</p>
            <Link href={communityHref} className="ec-btn-discuss">
              <span className="font-mono text-sm font-bold" aria-hidden>
                #
              </span>
              Discuss with other students
              <span className="font-mono text-xs font-bold opacity-90" aria-hidden>
                -&gt;
              </span>
            </Link>
          </div>

          {!isGradeBoundaries ? (
            <Link
              href={markHref}
              className="ec-btn-primary ec-blog-footer-cta__signup min-h-[48px] w-full justify-center"
              onClick={() =>
                trackFunnelEvent('mark_cta_clicked', {
                  source: 'blog_footer',
                  subject: subjectCode,
                  board: markBoard,
                })
              }
            >
              {markCtaLabel}
            </Link>
          ) : (
            <Link
              href={gradeHoldHref}
              className="ec-btn-primary ec-blog-footer-cta__signup min-h-[48px] w-full justify-center"
              onClick={() =>
                trackFunnelEvent('mark_cta_clicked', {
                  source: 'blog_footer_grade_hold',
                  subject: subjectCode,
                  board: markBoard,
                })
              }
            >
              Will my grade hold?
            </Link>
          )}

          <div className="ec-blog-footer-cta__secondary">
            <Link
              href={signupHref}
              className="ec-btn-ghost min-h-[44px] flex-1 justify-center"
              onClick={() =>
                trackFunnelEvent('signup_started', {
                  source: 'blog_footer',
                  subject: subjectCode,
                  board: markBoard,
                })
              }
            >
              Create free account
            </Link>
            {isGradeBoundaries ? (
              <>
                <Link
                  href={calculatorHref}
                  className="ec-btn-ghost min-h-[44px] flex-1 justify-center"
                >
                  Grade calculator
                </Link>
                <Link
                  href={markHref}
                  className="ec-btn-ghost min-h-[44px] flex-1 justify-center"
                >
                  {CTA_MARK_PAPER}
                </Link>
              </>
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
            {showEdexcelBridge ? (
              <Link
                href={EDEXCEL_UMS_HREF}
                className="ec-btn-ghost min-h-[44px] flex-1 justify-center"
              >
                Edexcel IAL UMS
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  )
}
