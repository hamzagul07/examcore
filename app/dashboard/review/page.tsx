import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import { buildReviewQueue } from '@/lib/courses/review-queue'
import { getErrorProfile } from '@/lib/review/error-profile'
import { getExamReadiness } from '@/lib/review/exam-readiness'

export const metadata: Metadata = {
  title: 'Review your misses',
  robots: { index: false, follow: false },
}

const LEVEL_LABEL: Record<string, string> = {
  critical: 'Needs work',
  sampled: 'Getting started',
}

export default async function ReviewPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin?next=%2Fdashboard%2Freview')

  const [items, profile, readiness] = await Promise.all([
    buildReviewQueue(user.id),
    getErrorProfile(user.id),
    getExamReadiness(user.id),
  ])

  return (
    <div className="mx-auto max-w-[var(--ec-content-max,860px)] px-4 py-10 sm:px-6">
      <p className="ec-eyebrow mb-2">Spaced review</p>
      <h1 className="text-hero mb-3">
        Review your <span className="ec-text-gradient">misses</span>
      </h1>
      <p className="mb-8 leading-relaxed text-[var(--ec-text-secondary)]">
        The topics you scored lowest on, ranked by how overdue they are. Re-practise
        one, get marked, and it drops down the list.
      </p>

      {readiness.length > 0 ? (
        <section className="mb-8">
          <p className="ec-eyebrow mb-3">Exam readiness — if you sat it today</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {readiness.map((r) => (
              <div key={r.subject} className="ec-card flex items-start gap-4 p-4 sm:p-5">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl font-bold text-white"
                  style={{ backgroundColor: r.color }}
                  aria-hidden
                >
                  {r.predictedGrade}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--ec-text-primary)]">
                    {r.subjectLabel}
                    <span className="ml-1.5 font-medium text-[var(--ec-text-faint)]">
                      · {r.coveragePct}% exam-ready · {r.confidence}% confidence
                    </span>
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--ec-text-secondary)]">
                    {r.nextLevelTip}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {profile.top ? (
        <section className="ec-card mb-8 p-5 sm:p-6">
          <p className="ec-eyebrow mb-2">Your mark-losing pattern</p>
          <h2 className="mb-1 text-lg font-bold text-[var(--ec-text-primary)]">
            <span aria-hidden>{profile.top.icon}</span> You lose most marks to{' '}
            {profile.top.label.toLowerCase()}
          </h2>
          <p className="mb-4 text-sm text-[var(--ec-text-secondary)]">
            {profile.top.pct}% of your lost marks
            {profile.topMarkType ? `, most often on ${profile.topMarkType.label} marks` : ''}.{' '}
            {profile.top.description}
          </p>
          <div className="flex flex-col gap-1.5">
            {profile.breakdown.map((e) => (
              <div key={e.classification} className="flex items-center gap-3 text-xs">
                <span className="w-36 shrink-0 text-[var(--ec-text-secondary)]">
                  <span aria-hidden>{e.icon}</span> {e.label}
                </span>
                <span
                  className="h-2 rounded-full bg-[var(--ec-brand)]"
                  style={{ width: `${Math.max(e.pct, 3)}%` }}
                  aria-hidden
                />
                <span className="shrink-0 tabular-nums text-[var(--ec-text-faint)]">{e.pct}%</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {items.length === 0 ? (
        <div className="ec-card p-6 text-center">
          <p className="mb-4 text-[var(--ec-text-secondary)]">
            Nothing to review yet — mark a few questions and your weak topics will
            surface here.
          </p>
          <Link href="/mark" className="ec-btn-primary">
            Mark a question →
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((it) => (
            <li
              key={`${it.subject}-${it.code}`}
              className="ec-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                      it.level === 'critical'
                        ? 'bg-[color-mix(in_srgb,#e0575b_16%,var(--ec-surface))] text-[#c53a3f]'
                        : 'bg-[color-mix(in_srgb,#e0a13a_18%,var(--ec-surface))] text-[#a06a11]'
                    }`}
                  >
                    {LEVEL_LABEL[it.level] ?? it.level}
                  </span>
                  <span className="text-xs font-medium text-[var(--ec-text-faint)]">
                    {it.subjectLabel} · {it.code}
                  </span>
                </div>
                <p className="truncate text-[15px] font-semibold text-[var(--ec-text-primary)]">
                  {it.name}
                </p>
                <p className="mt-0.5 text-[13px] text-[var(--ec-text-secondary)]">
                  {it.percentage}% over {it.attemptsCount}{' '}
                  {it.attemptsCount === 1 ? 'attempt' : 'attempts'}
                  {it.daysSince < 999
                    ? ` · last practised ${it.daysSince === 0 ? 'today' : `${it.daysSince}d ago`}`
                    : ''}
                </p>
                {it.topErrors.length > 0 ? (
                  <p className="mt-1.5 flex flex-wrap gap-1.5 text-[12px] text-[var(--ec-text-secondary)]">
                    {it.topErrors.map((e) => (
                      <span
                        key={e.label}
                        className="inline-flex items-center gap-1 rounded-md bg-[var(--ec-surface-muted)] px-2 py-0.5"
                      >
                        <span aria-hidden>{e.icon}</span>
                        {e.label}
                      </span>
                    ))}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {it.lessonHref ? (
                  <Link
                    href={it.lessonHref}
                    className="ec-btn-ghost ec-btn-ghost--sm whitespace-nowrap"
                  >
                    Study
                  </Link>
                ) : null}
                <Link
                  href={it.practiceHref}
                  className="ec-btn-primary ec-btn-primary--sm whitespace-nowrap"
                >
                  Review now →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
