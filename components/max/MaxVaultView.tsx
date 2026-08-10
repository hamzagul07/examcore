import Link from 'next/link'
import type { ReactNode } from 'react'
import { MaxBadge } from '@/components/max/MaxBadge'
import { MaxEarlyAccessBanner } from '@/components/max/MaxEarlyAccessBanner'
import { MaxCoachBrief } from '@/components/max/MaxCoachBrief'
import { MaxSubjectShelves } from '@/components/max/MaxSubjectShelves'
import { MaxVaultOwnership } from '@/components/max/MaxVaultOwnership'
import { MaxVaultDiagramPads } from '@/components/max/MaxVaultDiagramPads'
import { MaxVaultDiagramTheatre } from '@/components/max/MaxVaultDiagramTheatre'
import { MaxVaultCoursePath } from '@/components/max/MaxVaultCoursePath'
import { MaxVaultCommunityInvite } from '@/components/max/MaxVaultCommunityInvite'
import { MaxVaultPackChecklist } from '@/components/max/MaxVaultPackChecklist'
import { MaxVaultRewriteBank } from '@/components/max/MaxVaultRewriteBank'
import { MaxVaultCoachInbox } from '@/components/max/MaxVaultCoachInbox'
import type { MaxVaultData } from '@/lib/max/vault-data'
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
  const subjectLine =
    data.shelves.length > 0
      ? data.shelves.map((s) => s.name).join(' · ')
      : 'your subjects'
  const checklistDone = data.completedDays.length

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
          Tick the sprint, open live diagrams, beat your full-marks models, and act on
          your weekly coach — all built from{' '}
          <strong className="text-[var(--ec-text-primary)]">your marks</strong> for{' '}
          <strong className="text-[var(--ec-text-primary)]">{subjectLine}</strong>
          {data.subjectName ? ` · sprint focus ${data.subjectName}` : ''}.
          {sprintCreditsGranted
            ? ' Sprint bonus marks were just added to your account.'
            : null}
        </p>

        <ul className="ms-vault__chips" aria-label="Vault value at a glance">
          <li className="ms-vault__chip ms-vault__chip--brand">
            <span className="ms-vault__chip-value">
              {pack ? `${checklistDone}/${pack.days.length}` : '0'}
            </span>
            <span className="ms-vault__chip-label">Pack days done</span>
          </li>
          <li className="ms-vault__chip ms-vault__chip--gold">
            <span className="ms-vault__chip-value">
              {data.diagramTheatres.reduce((n, t) => n + t.catalogCount, 0) ||
                data.diagramTheatre?.catalogCount ||
                data.diagramPads.length}
            </span>
            <span className="ms-vault__chip-label">Concept cinema</span>
          </li>
          <li className="ms-vault__chip ms-vault__chip--blue">
            <span className="ms-vault__chip-value">{data.fullMarksModels.length}</span>
            <span className="ms-vault__chip-label">Models to beat</span>
          </li>
          <li className="ms-vault__chip ms-vault__chip--rose">
            <span className="ms-vault__chip-value">{data.coachInbox.length}</span>
            <span className="ms-vault__chip-label">Coach weeks</span>
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

      {data.diagramTheatres.length > 0 ? (
        <MaxVaultDiagramTheatre
          theatres={data.diagramTheatres}
          focusCode={data.subjectCode}
        />
      ) : data.diagramTheatre ? (
        <MaxVaultDiagramTheatre
          theatres={[data.diagramTheatre]}
          focusCode={data.subjectCode}
        />
      ) : null}
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
          eyebrow={pack.isSprint ? 'Exam sprint checklist' : "This week's Max checklist"}
          title={pack.title}
          tone={pack.isSprint ? 'rose' : 'teal'}
        >
          <MaxVaultPackChecklist
            key={`${pack.subjectCode}:${pack.completionKey || pack.weekLabel}`}
            pack={pack}
            initialCompleted={data.completedDays}
          />
        </VaultSection>
      ) : null}

      <MaxVaultRewriteBank models={data.fullMarksModels} />
      <MaxVaultCoachInbox weeks={data.coachInbox} />
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
        <VaultSection
          stamp="IB"
          eyebrow="Sit the real paper"
          title="Licensed past papers"
          tone="blue"
        >
          <p className="text-body m-0 text-[var(--ec-text-secondary)]">
            IB papers are copyrighted — we send you to official / licensed free sources.
            Sit the paper there, then come back and mark on MarkScheme.
          </p>
          <ul className="m-0 list-none space-y-3 pl-0">
            {data.ibLinks.map((l) => {
              const external = l.href.startsWith('http')
              return (
                <li key={l.href}>
                  {external ? (
                    <a
                      href={l.href}
                      className="ec-link font-semibold"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {l.label} ↗
                    </a>
                  ) : (
                    <Link href={l.href} className="ec-link font-semibold">
                      {l.label}
                    </Link>
                  )}
                  <span className="block text-sm text-[var(--ec-text-secondary)]">{l.note}</span>
                </li>
              )
            })}
          </ul>
        </VaultSection>
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
