import Link from 'next/link'
import type { ReactNode } from 'react'
import { MaxBadge } from '@/components/max/MaxBadge'
import { MaxEarlyAccessBanner } from '@/components/max/MaxEarlyAccessBanner'
import { MaxCoachBrief } from '@/components/max/MaxCoachBrief'
import { MaxSubjectShelves } from '@/components/max/MaxSubjectShelves'
import type { MaxVaultData } from '@/lib/max/vault-data'
import { drillHref } from '@/lib/insights/drill-link'
import { MaxVaultOpenTracker } from '@/components/max/MaxVaultOpenTracker'

function DeskSection({
  stamp,
  eyebrow,
  title,
  children,
}: {
  stamp: string
  eyebrow?: string
  title: string
  children: ReactNode
}) {
  return (
    <section className="ms-dash-section mb-6 open">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          {stamp}
        </span>
        {eyebrow ? <p className="ec-eyebrow mb-0">{eyebrow}</p> : null}
        <h2 className="ms-dash-section__title m-0 text-[var(--ec-text-primary)]">{title}</h2>
      </div>
      <div className="ec-card ec-card--paper space-y-4 p-4 sm:p-5">{children}</div>
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
  const subjectLine =
    data.shelves.length > 0
      ? data.shelves.map((s) => s.name).join(' · ')
      : 'your subjects'

  return (
    <div className="mx-auto min-w-0 max-w-7xl px-4 pb-12 pt-6 sm:px-6">
      <MaxVaultOpenTracker subjectCode={data.subjectCode} sprint={data.sprintUnlocked} />

      <header className="ms-dash-hero mb-8 lg:mb-10">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="ec-eyebrow mb-0">Max desk</p>
          <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
            MX
          </span>
          <MaxBadge label="Resource Vault" />
          {data.sprintUnlocked ? <MaxBadge label="Sprint unlocked" /> : null}
        </div>
        <h1 className="text-hero text-[var(--ec-text-primary)]">Your Max Vault</h1>
        <p className="text-body mt-3 max-w-2xl text-[var(--ec-text-secondary)]">
          Built for {subjectLine}
          {data.subjectName ? ` — sprint focused on ${data.subjectName}` : ''}.
          {sprintCreditsGranted
            ? ' Sprint bonus marks were just added to your account.'
            : null}
        </p>
        <p className="text-caption mt-2">
          <Link
            href="/dashboard"
            className="text-[var(--ec-text-secondary)] underline-offset-2 hover:text-[var(--ec-brand)] hover:underline"
          >
            ← Back to Home desk
          </Link>
        </p>
      </header>

      <MaxEarlyAccessBanner />
      <MaxCoachBrief pack={pack} />

      {data.shelves.length > 0 ? (
        <MaxSubjectShelves shelves={data.shelves} focusCode={data.subjectCode} />
      ) : null}

      {projected && projected.prediction.predictedGrade !== '—' ? (
        <DeskSection stamp="A*" eyebrow="Form" title="Projected grade">
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
          <p className="text-caption m-0">
            Confidence {projected.prediction.confidence}% · Max-only
          </p>
        </DeskSection>
      ) : null}

      {pack ? (
        <DeskSection
          stamp={pack.isSprint ? 'SP' : 'WK'}
          eyebrow={pack.isSprint ? 'Exam sprint' : 'This week'}
          title={pack.title}
        >
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
            <div className="border border-[var(--ec-border)] bg-[var(--ec-surface-muted,transparent)] p-3">
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

          <ol className="m-0 list-decimal space-y-4 pl-5">
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
                  <ul className="mt-2 list-none space-y-1 pl-0">
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
        </DeskSection>
      ) : null}

      {!curated && data.otherCuratedCodes.length > 0 ? (
        <DeskSection stamp="★" eyebrow="Flagship" title="More curated packs">
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
        </DeskSection>
      ) : null}

      <DeskSection stamp="A*" eyebrow="Rewrite bank" title="Your full-marks models">
        {data.fullMarksModels.length > 0 ? (
          <ul className="m-0 list-none space-y-3 pl-0">
            {data.fullMarksModels.map((m) => (
              <li
                key={m.attemptId}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--ec-border)] pb-3 last:border-0 last:pb-0"
              >
                <Link
                  href={`/dashboard/attempt/${m.attemptId}`}
                  className="ec-link font-semibold"
                >
                  {m.label}
                </Link>
                <span className="font-mono text-xs text-[var(--ec-text-secondary)]">
                  {m.marksEarned}/{m.totalMarks}
                  {m.subjectCode ? ` · ${m.subjectCode}` : ''}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body m-0 text-[var(--ec-text-secondary)]">
            Mark questions where you lose marks — Max saves the annotated full-marks
            rewrite here automatically.
          </p>
        )}
      </DeskSection>

      {data.ibLinks.length > 0 ? (
        <DeskSection stamp="IB" eyebrow="Legitimate sources" title="IB resources">
          <ul className="m-0 list-none space-y-3 pl-0">
            {data.ibLinks.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="ec-link font-semibold" rel="noopener noreferrer">
                  {l.label}
                </a>
                <span className="block text-sm text-[var(--ec-text-secondary)]">{l.note}</span>
              </li>
            ))}
          </ul>
        </DeskSection>
      ) : null}

      <DeskSection stamp="⚙" eyebrow="Utilities" title="Tools">
        <ul className="m-0 grid list-none gap-3 pl-0 sm:grid-cols-2">
          {data.tools.map((l) => (
            <li key={l.href} className="border border-[var(--ec-border)] p-3">
              <Link href={l.href} className="ec-link font-semibold">
                {l.label}
              </Link>
              <span className="mt-1 block text-sm text-[var(--ec-text-secondary)]">{l.note}</span>
            </li>
          ))}
        </ul>
      </DeskSection>
    </div>
  )
}
