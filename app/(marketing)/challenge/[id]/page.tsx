import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getChallenge } from '@/lib/seo/challenges'
import { ChallengeShareActions } from '@/components/seo/ChallengeShareActions'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const challenge = getChallenge(id)
  if (!challenge) return {}
  return createPageMetadata({
    title: `Can you beat ${challenge.score}/${challenge.total}? — ${challenge.title}`,
    description: `Challenge: ${challenge.title}. Score ${challenge.score}/${challenge.total}. Take the same quiz on MarkScheme.`,
    path: `/challenge/${id}`,
    ogImagePath: `/api/og/challenge/${id}`,
    // Ephemeral share cards — never index; they would explode URL space.
    index: false,
  })
}

export default async function ChallengePage({ params }: Props) {
  const { id } = await params
  const challenge = getChallenge(id)
  if (!challenge) notFound()

  const pct =
    challenge.total > 0 ? Math.round((challenge.score / challenge.total) * 100) : null

  return (
    <MarketingPageShell>
      <MarketingHero
        label="Challenge"
        title={`Can you beat ${challenge.score}/${challenge.total}?`}
        lead={`${challenge.title}. Someone scored ${challenge.score} out of ${challenge.total}${challenge.percentile ? ` (top ${challenge.percentile}%)` : ''}.`}
      />
      <MarketingSection className="!pt-0">
        <article className="ec-card ec-card--paper mx-auto max-w-lg border border-[var(--ec-border)] p-6 shadow-[var(--ec-shadow-hard,6px_6px_0_rgba(0,0,0,0.1))] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span
              className="inline-grid h-7 min-w-7 place-items-center rounded border border-[var(--ec-brand-border)] bg-[var(--ec-brand-muted)] px-2 font-mono text-[11px] font-bold tracking-wide text-[var(--ec-brand)]"
              aria-hidden
            >
              VS
            </span>
            <span className="font-mono text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--ec-text-faint)]">
              Examiner&apos;s Ink · challenge slip
            </span>
          </div>

          <p className="ms-overline mt-5" style={{ color: 'var(--ec-brand)' }}>
            Their score
          </p>
          <p className="font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight text-[var(--ec-text-primary)]">
            {challenge.score}
            <span className="text-2xl text-[var(--ec-text-secondary)]"> / {challenge.total}</span>
            {pct != null ? (
              <span className="ml-3 font-mono text-lg font-bold text-[var(--ec-brand)]">
                {pct}%
              </span>
            ) : null}
          </p>
          <p className="ms-body-2 mt-2">{challenge.title}</p>
          {challenge.percentile ? (
            <p className="mt-3 inline-block rounded border border-[var(--ec-border)] bg-[var(--ec-brand-muted)] px-3 py-1.5 font-mono text-xs font-bold tracking-wide text-[var(--ec-brand)]">
              Top {challenge.percentile}%
            </p>
          ) : null}

          <p className="ms-body-2 mt-6 border-t border-dashed border-[var(--ec-border)] pt-5">
            Take the same quick check, then share your score — green pen, no fluff.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={challenge.quizHref} className="ec-btn-primary min-h-[48px]">
              Accept challenge
            </Link>
            <Link href="/mark" className="ec-btn-ghost min-h-[48px]">
              Mark a past paper
            </Link>
          </div>

          <ChallengeShareActions
            title={challenge.title}
            score={challenge.score}
            total={challenge.total}
            challengePath={`/challenge/${id}`}
          />
        </article>
      </MarketingSection>
    </MarketingPageShell>
  )
}
