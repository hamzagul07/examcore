import Link from 'next/link'
import { buildMarketingSignUpHref } from '@/lib/auth-redirect'
import { getResultsDayPhase } from '@/lib/seo/results-day'

type BlogPostCtaProps = {
  variant?: 'default' | 'subject' | 'ib' | 'ib-ia' | 'grade-boundaries'
  subjectCode?: string | null
}

/** End-of-article conversion block — internal link to product. */
export function BlogPostCta({ variant = 'default', subjectCode = null }: BlogPostCtaProps) {
  const isSubject = variant === 'subject'
  const isIb = variant === 'ib' || variant === 'ib-ia'
  const isIa = variant === 'ib-ia'
  const isGradeBoundaries = variant === 'grade-boundaries'
  const resultsPhase = isGradeBoundaries ? getResultsDayPhase() : null
  const showResultsGuide =
    isGradeBoundaries && resultsPhase && resultsPhase !== 'post-igcse'
  const calculatorHref = subjectCode
    ? `/tools/grade-boundary-calculator/${subjectCode}`
    : '/tools/grade-boundary-calculator'
  const markHref = subjectCode ? `/mark?subject=${subjectCode}` : '/mark'

  return (
    <aside className="ms-blog-cta-block mt-12">
      <p className="ms-overline">Try Markscheme</p>
      <h2 className="ms-h3" style={{ marginTop: 8 }}>
        {isGradeBoundaries
          ? 'Estimate your grade from past papers'
          : isIa
            ? 'Get criterion feedback on your IA draft'
            : isIb
              ? 'Practise IB criterion marking'
              : isSubject
                ? 'Mark this subject now'
                : 'Mark your next past paper mark-by-mark'}
      </h2>
      <p className="ms-body-2" style={{ marginTop: 12 }}>
        {isGradeBoundaries ? (
          <>
            Add your component raw marks from recent{' '}
            {subjectCode ? (
              <strong className="text-[var(--ec-text-primary)]">{subjectCode}</strong>
            ) : (
              'past paper'
            )}{' '}
            sittings — our calculator maps them to the latest published grade thresholds.
            Then mark your next script against the real scheme for free.
          </>
        ) : isIa ? (
          <>
            Upload a section of your IA for{' '}
            <strong className="text-[var(--ec-text-primary)]">band-by-band IB feedback</strong>
            — aligned to assessment criteria, not generic essay grades. Pair with free{' '}
            <strong className="text-[var(--ec-text-primary)]">syllabus lessons</strong> for
            methodology and vocabulary.
          </>
        ) : isIb ? (
          <>
            Upload an extended response or IA section for{' '}
            <strong className="text-[var(--ec-text-primary)]">band-by-band IB feedback</strong>
            — aligned to markbands and assessment criteria. Pair with{' '}
            <strong className="text-[var(--ec-text-primary)]">topic practice</strong> on your
            syllabus points. Free tier available.
          </>
        ) : isSubject ? (
          <>
            Use <strong className="text-[var(--ec-text-primary)]">Past paper</strong> for official
            papers in our library, or{' '}
            <strong className="text-[var(--ec-text-primary)]">My question</strong> for homework —
            add your question, upload your answer, get Cambridge-style feedback. Free tier
            available.
          </>
        ) : (
          <>
            Upload a photo of your handwritten answer — or a whole paper — and get feedback tied
            to the real Cambridge mark scheme. Free tier available.
          </>
        )}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {isGradeBoundaries ? (
          <>
            <Link
              href={calculatorHref}
              className="ec-btn-primary inline-flex min-h-[48px] justify-center"
            >
              Grade calculator
            </Link>
            <Link
              href={markHref}
              className="ec-btn-secondary inline-flex min-h-[48px] justify-center"
            >
              Mark a paper free
            </Link>
            {showResultsGuide ? (
              <Link
                href="/blog/cambridge-results-day-august-2026-guide"
                className="ec-btn-ghost inline-flex min-h-[48px] justify-center"
              >
                Results day guide
              </Link>
            ) : null}
          </>
        ) : (
          <>
            <Link href="/mark" className="ec-btn-primary inline-flex min-h-[48px] justify-center">
              {isIa ? 'Criterion marking' : isIb ? 'Criterion marking' : 'Mark a paper free'}
            </Link>
            {isIb && !isIa ? (
              <Link
                href="/ib/past-papers/biology-hl#ib-topic-practice"
                className="ec-btn-secondary inline-flex min-h-[48px] justify-center"
              >
                Topic practice
              </Link>
            ) : null}
          </>
        )}
        <Link
          href={buildMarketingSignUpHref()}
          className="ec-btn-secondary inline-flex min-h-[48px] justify-center"
        >
          Create free account
        </Link>
      </div>
    </aside>
  )
}
