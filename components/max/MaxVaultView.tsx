import Link from 'next/link'
import type { ReactNode } from 'react'
import { MaxBadge } from '@/components/max/MaxBadge'
import { MaxEarlyAccessBanner } from '@/components/max/MaxEarlyAccessBanner'
import { MaxCoachBrief } from '@/components/max/MaxCoachBrief'
import { MaxSubjectShelves } from '@/components/max/MaxSubjectShelves'
import type { MaxVaultData } from '@/lib/max/vault-data'
import { drillHref } from '@/lib/insights/drill-link'
import { MaxVaultOpenTracker } from '@/components/max/MaxVaultOpenTracker'

function Section({
  stamp,
  title,
  children,
}: {
  stamp: string
  title: string
  children: ReactNode
}) {
  return (
    <section className="ec-card ec-card--paper mb-6 space-y-3 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          {stamp}
        </span>
        <h2 className="text-lg font-bold text-[var(--ec-text-primary)] m-0">{title}</h2>
      </div>
      {children}
    </section>
  )
}

export function MaxVaultView({
  data,
  sprintCreditsGranted,
}: {
  data: MaxVaultData
  sprintCreditsGranted?: boolean
}) {
  const pack = data.examPack
  const curated = data.curated
  const projected = data.projected

  return (
    <div className="mx-auto max-w-3xl space-y-2 px-4 pb-12 pt-6 sm:px-6">
      <MaxVaultOpenTracker subjectCode={data.subjectCode} sprint={data.sprintUnlocked} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <MaxBadge label="Max Resource Vault" />
        {data.sprintUnlocked ? <MaxBadge label="Sprint unlocked" /> : null}
      </div>
      <h1 className="text-title text-[var(--ec-text-primary)]">Your Max Vault</h1>
      <p className="text-body mb-6 text-[var(--ec-text-secondary)]">
        Resources for{' '}
        {data.shelves.length > 0
          ? data.shelves.map((s) => s.name).join(', ')
          : 'your subjects'}
        {data.subjectName ? ` — sprint focused on ${data.subjectName}` : ''}.
        {sprintCreditsGranted
          ? ' Sprint bonus marks were just added to your account.'
          : null}
      </p>

      <MaxEarlyAccessBanner />

      <MaxCoachBrief pack={pack} />

      {data.shelves.length > 0 ? (
        <MaxSubjectShelves shelves={data.shelves} focusCode={data.subjectCode} />
      ) : null}

      {projected && projected.prediction.predictedGrade !== '—' ? (
        <Section stamp="A*" title="Projected grade">
          <p className="text-body m-0 text-[var(--ec-text-primary)]">
            On current form you&apos;re tracking{' '}
            <strong style={{ color: projected.prediction.color }}>
              {projected.prediction.predictedGrade}
            </strong>
            {projected.prediction.averagePercentage !== null
              ? ` (~${Math.round(projected.prediction.averagePercentage)}%)`
              : null}
            {projected.targetGrade ? (
              <>
                {' '}
                · target <strong>{projected.targetGrade}</strong>
                {projected.onTrack
                  ? ' — on track'
                  : projected.pointsToTarget !== null
                    ? ` — ${projected.pointsToTarget}% to go`
                    : null}
              </>
            ) : null}
          </p>
          <p className="text-body m-0 text-[var(--ec-text-secondary)]">
            {projected.prediction.nextLevelTip}
          </p>
          <p className="text-sm m-0 text-[var(--ec-text-secondary)]">
            Confidence {projected.prediction.confidence}% · Max-only dashboard widget
          </p>
        </Section>
      ) : null}

      {pack ? (
        <Section stamp={pack.isSprint ? 'SP' : 'WK'} title={pack.title}>
          <p className="text-body m-0 text-[var(--ec-text-secondary)]">
            Week of {pack.weekLabel}
            {pack.daysLeft !== null
              ? ` · ${pack.daysLeft} day${pack.daysLeft === 1 ? '' : 's'} to exam`
              : null}
            {pack.weakTopics.length > 0
              ? ` · focusing on ${pack.weakTopics
                  .slice(0, 3)
                  .map((t) => t.name)
                  .join(', ')}`
              : ' · mark a few questions to personalise this pack'}
          </p>

          {pack.isSprint && pack.timedPapers.length > 0 ? (
            <div className="rounded border border-[var(--ec-border)] p-3">
              <p className="ms-overline m-0 mb-2">Sprint timed papers</p>
              <ul className="m-0 list-none space-y-2 pl-0">
                {pack.timedPapers.map((p) => (
                  <li key={p.label}>
                    <Link href={p.href} className="ec-link font-semibold">
                      {p.label}
                    </Link>
                    <span className="text-[var(--ec-text-secondary)]">
                      {' '}
                      · {p.minutes} min under timed conditions, then mark
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <ol className="m-0 list-decimal space-y-3 pl-5">
            {pack.days.map((day) => (
              <li key={day.day} className="text-body text-[var(--ec-text-primary)]">
                <strong>
                  Day {day.day}
                  {day.kind === 'timed_paper'
                    ? ' · timed'
                    : day.kind === 'review'
                      ? ' · review'
                      : ''}
                  :
                </strong>{' '}
                {day.focus}
                {day.paperHref ? (
                  <div className="mt-1">
                    <Link href={day.paperHref} className="ec-link font-semibold">
                      Open past papers →
                    </Link>
                  </div>
                ) : null}
                {day.drills.length > 0 ? (
                  <ul className="mt-1 list-none space-y-1 pl-0">
                    {day.drills.map((d) => (
                      <li key={`${d.paperCode}-${d.questionNumber}`}>
                        <Link href={drillHref(d)} className="ec-link font-semibold">
                          {d.paperCode} Q{d.questionNumber}
                        </Link>
                        <span className="text-[var(--ec-text-secondary)]"> — {d.reason}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {/* Curated + technique live in MaxSubjectShelves per subject — avoid duplicating here. */}
      {!curated && data.otherCuratedCodes.length > 0 ? (
        <Section stamp="★" title="More flagship packs">
          <p className="text-body m-0 text-[var(--ec-text-secondary)]">
            Curated Max packs also ship for{' '}
            {data.otherCuratedCodes.map((c, i) => (
              <span key={c}>
                {i > 0 ? ', ' : ''}
                <Link
                  href={`/dashboard/vault?subject=${encodeURIComponent(c)}`}
                  className="ec-link font-semibold"
                >
                  {c}
                </Link>
              </span>
            ))}
            .
          </p>
        </Section>
      ) : null}

      {data.fullMarksModels.length > 0 ? (
        <Section stamp="A*" title="Your full-marks model bank">
          <ul className="m-0 list-none space-y-2 pl-0">
            {data.fullMarksModels.map((m) => (
              <li key={m.attemptId}>
                <Link
                  href={`/dashboard/attempt/${m.attemptId}`}
                  className="ec-link font-semibold"
                >
                  {m.label}
                </Link>
                <span className="text-[var(--ec-text-secondary)]">
                  {' '}
                  · {m.marksEarned}/{m.totalMarks}
                  {m.subjectCode ? ` · ${m.subjectCode}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : (
        <Section stamp="A*" title="Your full-marks model bank">
          <p className="text-body m-0 text-[var(--ec-text-secondary)]">
            Mark questions where you lose marks — Max saves the annotated full-marks rewrite here
            automatically.
          </p>
        </Section>
      )}

      {data.ibLinks.length > 0 ? (
        <Section stamp="IB" title="IB legitimate resources">
          <ul className="m-0 list-none space-y-2 pl-0">
            {data.ibLinks.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="ec-link font-semibold" rel="noopener noreferrer">
                  {l.label}
                </a>
                <span className="block text-sm text-[var(--ec-text-secondary)]">{l.note}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section stamp="⚙" title="Tools">
        <ul className="m-0 list-none space-y-2 pl-0">
          {data.tools.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="ec-link font-semibold">
                {l.label}
              </Link>
              <span className="block text-sm text-[var(--ec-text-secondary)]">{l.note}</span>
            </li>
          ))}
        </ul>
      </Section>

      <p className="text-sm text-[var(--ec-text-secondary)]">
        <Link href="/dashboard" className="ec-link">
          ← Back to dashboard
        </Link>
      </p>
    </div>
  )
}
