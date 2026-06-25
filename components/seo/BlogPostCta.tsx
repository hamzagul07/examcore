import Link from 'next/link'
import { buildMarketingSignUpHref } from '@/lib/auth-redirect'

type BlogPostCtaProps = {
  variant?: 'default' | 'subject' | 'ib'
}

/** End-of-article conversion block — internal link to product. */
export function BlogPostCta({ variant = 'default' }: BlogPostCtaProps) {
  const isSubject = variant === 'subject'
  const isIb = variant === 'ib'

  return (
    <aside className="ms-blog-cta-block mt-12">
      <p className="ms-overline">Try Markscheme</p>
      <h2 className="ms-h3" style={{ marginTop: 8 }}>
        {isIb
          ? 'Practise IB criterion marking'
          : isSubject
            ? 'Mark this subject now'
            : 'Mark your next past paper mark-by-mark'}
      </h2>
      <p className="ms-body-2" style={{ marginTop: 12 }}>
        {isIb ? (
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
        <Link href="/mark" className="ec-btn-primary inline-flex min-h-[48px] justify-center">
          {isIb ? 'Criterion marking' : 'Mark a paper free'}
        </Link>
        {isIb ? (
          <Link
            href="/ib/past-papers/biology-hl#ib-topic-practice"
            className="ec-btn-secondary inline-flex min-h-[48px] justify-center"
          >
            Topic practice
          </Link>
        ) : null}
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
