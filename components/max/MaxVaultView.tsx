import Link from 'next/link'
import type { ReactNode } from 'react'
import { MaxBadge } from '@/components/max/MaxBadge'
import { MaxEarlyAccessBanner } from '@/components/max/MaxEarlyAccessBanner'
import { MaxCoachBrief } from '@/components/max/MaxCoachBrief'
import { MaxSubjectShelves } from '@/components/max/MaxSubjectShelves'
import { MaxVaultOwnership } from '@/components/max/MaxVaultOwnership'
import { MaxVaultDiagramPads } from '@/components/max/MaxVaultDiagramPads'
import { MaxVaultCoursePath } from '@/components/max/MaxVaultCoursePath'
import { MaxVaultCommunityInvite } from '@/components/max/MaxVaultCommunityInvite'
import type { MaxVaultData } from '@/lib/max/vault-data'
import { drillHref } from '@/lib/insights/drill-link'
import { MaxVaultOpenTracker } from '@/components/max/MaxVaultOpenTracker'

function VaultSection({
  stamp,
  eyebrow,
  title,
  tone = 'default',
  children,
}: {
  stamp: string
  eyebrow?: string
  title: string
  tone?: 'default' | 'brand' | 'gold' | 'blue' | 'teal' | 'rose'
  children: ReactNode
}) {
  const panel =
    tone === 'default' ? 'ms-vault__panel' : `ms-vault__panel ms-vault__panel--${tone}`
  return (
    <section className="ms-vault__section">
      <div className="ms-vault__section-head">
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          {stamp}
        </span>
        {eyebrow ? <p className="ec-eyebrow mb-0">{eyebrow}</p> : null}
        <h2 className="m-0 text-lg font-bold text-[var(--ec-text-primary)]">{title}</h2>
      </div>
      <div className={`${panel} space-y-4`}>{children}</div>
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
  const drillCount = pack?.days.reduce((n, d) => n + d.drills.length, 0) ?? 0
  const subjectLine =
    data.shelves.length > 0
      ? data.shelves.map((s) => s.name).join(' · ')
      : 'your subjects'

  return (
    <div className="ms-vault mx-auto min-w-0 max-w-7xl px-4 pb-12 pt-6 sm:px-6">
      <MaxVaultOpenTracker subjectCode={data.subjectCode} sprint={data.sprintUnlocked} />

      <header className="ms-vault__hero">
        <div className="ms-vault__hero-top">
          <p className="ec-eyebrow mb-0">Max Resource Vault</p>
          <MaxBadge label="You own this" />
          {data.sprintUnlocked ? <MaxBadge label="Sprint unlocked" /> : null}
        </div>
        <h1 className="text-hero m-0 text-[var(--ec-text-primary)]">
          Your private exam machine
        </h1>
        <p className="text-body mt-3 max-w-2xl text-[var(--ec-text-secondary)]">
          Not a list of Google links — a Max desk built from{' '}
          <strong className="text-[var(--ec-text-primary)]">your marks</strong>, our live
          diagrams, course lessons, full-marks rewrites, and priority marking for{' '}
          <strong className="text-[var(--ec-text-primary)]">{subjectLine}</strong>
          {data.subjectName ? ` · sprint focus ${data.subjectName}` : ''}.
          {sprintCreditsGranted
            ? ' Sprint bonus marks were just added to your account.'
            : null}
        </p>

        <ul className="ms-vault__chips" aria-label="Vault value at a glance">
          <li className="ms-vault__chip ms-vault__chip--brand">
            <span className="ms-vault__chip-value">{pack?.days.length ?? 0}</span>
            <span className="ms-vault__chip-label">
              {pack?.isSprint ? 'Sprint days' : 'Week days'}
            </span>
          </li>
          <li className="ms-vault__chip ms-vault__chip--gold">
            <span className="ms-vault__chip-value">{data.diagramPads.length}</span>
            <span className="ms-vault__chip-label">Live diagrams</span>
          </li>
          <li className="ms-vault__chip ms-vault__chip--blue">
            <span className="ms-vault__chip-value">{data.courseLessons.length}</span>
            <span className="ms-vault__chip-label">Course fixes</span>
          </li>
          <li className="ms-vault__chip ms-vault__chip--rose">
            <span className="ms-vault__chip-value">
              {data.fullMarksModels.length || drillCount}
            </span>
            <span className="ms-vault__chip-label">
              {data.fullMarksModels.length > 0 ? 'Full-marks models' : 'Ready drills'}
            </span>
          </li>
        </ul>

        <p className="text-caption mt-4 mb-0">
          <Link
            href="/dashboard"
            className="text-[var(--ec-text-secondary)] underline-offset-2 hover:text-[var(--ec-brand)] hover:underline"
          >
            ← Back to Home desk
          </Link>
        </p>
      </header>

      <MaxEarlyAccessBanner />
      {data.ownership ? <MaxVaultOwnership ownership={data.ownership} /> : null}
      <MaxCoachBrief pack={pack} />

      <MaxVaultDiagramPads pads={data.diagramPads} subjectCode={data.subjectCode} />
      <MaxVaultCoursePath
        lessons={data.courseLessons}
        subjectCode={data.subjectCode}
        subjectName={data.subjectName}
      />

      {projected && projected.prediction.predictedGrade !== '—' ? (
        <VaultSection stamp="A*" eyebrow="Live form" title="Projected grade" tone="brand">
          <div className="ms-vault__grade">
            <div
              className="ms-vault__grade-mark"
              style={{ color: projected.prediction.color || 'var(--ec-brand)' }}
            >
              {projected.prediction.predictedGrade}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-body m-0 text-[var(--ec-text-primary)]">
                {projected.prediction.averagePercentage !== null
                  ? `~${Math.round(projected.prediction.averagePercentage)}% on current marking`
                  : 'Built from your recent marks'}
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
                Confidence {projected.prediction.confidence}% · Max-only projection from your
                attempts — not a public grade calculator.
              </p>
            </div>
          </div>
        </VaultSection>
      ) : null}

      {pack ? (
        <VaultSection
          stamp={pack.isSprint ? 'SP' : 'WK'}
          eyebrow={pack.isSprint ? 'Exam sprint pack' : "This week's Max pack"}
          title={pack.title}
          tone={pack.isSprint ? 'rose' : 'teal'}
        >
          <p className="text-body m-0 text-[var(--ec-text-secondary)]">
            Built from your mastery graph + real past-paper rows — not a generic revision
            timetable.
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
            <div className="ms-vault__panel ms-vault__panel--rose !shadow-none p-3">
              <p className="ms-overline m-0 mb-2 text-[var(--ec-acc-rose)]">
                Three timed papers
              </p>
              <ul className="m-0 list-none space-y-2 pl-0">
                {pack.timedPapers.map((p) => (
                  <li key={p.label}>
                    <Link href={p.href} className="ec-link font-semibold">
                      {p.label}
                    </Link>
                    <span className="text-[var(--ec-text-secondary)]">
                      {' '}
                      · {p.minutes} min under timed conditions, then mark on MarkScheme
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <ol className="ms-vault__days">
            {pack.days.map((day) => {
              const kindClass =
                day.kind === 'timed_paper'
                  ? 'ms-vault__day--timed'
                  : day.kind === 'review'
                    ? 'ms-vault__day--review'
                    : 'ms-vault__day--drill'
              return (
                <li key={day.day} className={`ms-vault__day ${kindClass}`}>
                  <div className="ms-vault__day-body">
                    <span className="ms-vault__day-kind">
                      {day.kind === 'timed_paper'
                        ? 'Timed paper'
                        : day.kind === 'review'
                          ? 'Review'
                          : 'Drill'}
                    </span>
                    <p className="m-0 font-semibold text-[var(--ec-text-primary)]">{day.focus}</p>
                    {day.paperHref ? (
                      <div className="mt-2">
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
                            <span className="text-[var(--ec-text-secondary)]">
                              {' '}
                              — {d.reason}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>
        </VaultSection>
      ) : null}

      <VaultSection stamp="A*" eyebrow="Rewrite bank" title="Your full-marks models" tone="brand">
        {data.fullMarksModels.length > 0 ? (
          <ul className="m-0 grid list-none gap-2 pl-0 sm:grid-cols-2">
            {data.fullMarksModels.map((m) => (
              <li key={m.attemptId} className="ms-vault__model">
                <Link
                  href={`/dashboard/attempt/${m.attemptId}`}
                  className="ec-link font-semibold"
                >
                  {m.label}
                </Link>
                <span className="ms-vault__model-score">
                  {m.marksEarned}/{m.totalMarks}
                  {m.subjectCode ? ` · ${m.subjectCode}` : ''}
                </span>
                <span className="block text-caption text-[var(--ec-text-secondary)]">
                  Annotated rewrite of your answer — reopen and beat it.
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body m-0 text-[var(--ec-text-secondary)]">
            Mark questions where you lose marks — Max saves the annotated full-marks
            rewrite of <em>your</em> script here. That bank only exists because you mark
            on MarkScheme.
          </p>
        )}
      </VaultSection>

      <MaxVaultCommunityInvite hooks={data.communityHooks} />

      {data.shelves.length > 0 ? (
        <MaxSubjectShelves shelves={data.shelves} focusCode={data.subjectCode} />
      ) : null}

      {!curated && data.otherCuratedCodes.length > 0 ? (
        <VaultSection stamp="★" eyebrow="Flagship" title="More curated packs" tone="gold">
          <p className="text-body m-0 text-[var(--ec-text-secondary)]">
            Jump into examiner-curated Max packs for{' '}
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
        </VaultSection>
      ) : null}

      {data.ibLinks.length > 0 ? (
        <details className="ms-vault__section">
          <summary className="ms-vault__extras-summary">
            Extra IB reference links (optional)
          </summary>
          <div className="ms-vault__panel ms-vault__panel--blue mt-3 space-y-3">
            <p className="text-caption m-0 text-[var(--ec-text-secondary)]">
              Official / community references — secondary to your MarkScheme drills and
              lessons above.
            </p>
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
          </div>
        </details>
      ) : null}

      <details className="ms-vault__section">
        <summary className="ms-vault__extras-summary">Utilities</summary>
        <div className="ms-vault__panel ms-vault__panel--teal mt-3">
          <ul className="ms-vault__tool-grid">
            {data.tools.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="ms-vault__tool">
                  <span className="ec-link font-semibold">{l.label}</span>
                  <span className="mt-1 block text-sm text-[var(--ec-text-secondary)]">
                    {l.note}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </div>
  )
}
