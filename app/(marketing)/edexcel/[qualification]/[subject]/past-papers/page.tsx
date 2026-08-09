import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  MarketingHero,
  MarketingPageShell,
  MarketingSection,
} from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getEdexcelQualification } from '@/lib/edexcel/catalog'
import { getEdexcelIalSessionsForUnit } from '@/lib/edexcel/ial-paper-sessions'
import { edexcelMarkHref, getEdexcelMarkableUnitCodes } from '@/lib/edexcel/marking'
import { edexcelSubjectPastPapersGuideHref } from '@/lib/edexcel/seo-guides'
import {
  edexcelRootPath,
  edexcelSubjectPath,
  edexcelUnitPath,
  getAllEdexcelSubjectParams,
  resolveEdexcelSubject,
} from '@/lib/seo/edexcel-graph'
import { buildEdexcelSubjectCopy } from '@/lib/seo/edexcel-seo'

type Props = { params: Promise<{ qualification: string; subject: string }> }

export function generateStaticParams() {
  return getAllEdexcelSubjectParams()
}

export async function generateMetadata({ params }: Props) {
  const { qualification, subject: subjectSlug } = await params
  const subject = resolveEdexcelSubject(qualification, subjectSlug)
  if (!subject) return {}
  const copy = buildEdexcelSubjectCopy(subject)
  return createPageMetadata({
    title: `Edexcel IAL ${subject.name} past papers`,
    description: `Past-paper index for Edexcel International A Level ${subject.name} (${subject.familyCode}). Organised by unit — ${subject.units.map((u) => u.code).join(', ')}.`,
    path: copy.pastPapersPath,
    keywords: [
      `Edexcel IAL ${subject.name} past papers`,
      `${subject.familyCode} past papers`,
      'Edexcel International A Level past papers',
    ],
  })
}

export default async function EdexcelPastPapersPage({ params }: Props) {
  const { qualification, subject: subjectSlug } = await params
  const subject = resolveEdexcelSubject(qualification, subjectSlug)
  if (!subject) notFound()
  const qual = getEdexcelQualification(qualification)
  if (!qual) notFound()
  const copy = buildEdexcelSubjectCopy(subject)
  const markable = new Set(getEdexcelMarkableUnitCodes())
  const markingLive = subject.markingWave === 1 || subject.markingWave === 1.5
  const defaultUnit =
    subject.slug === 'mathematics'
      ? 'WMA11'
      : subject.slug === 'physics'
        ? 'WPH11'
        : subject.slug === 'chemistry'
          ? 'WCH11'
          : subject.slug === 'biology'
            ? 'WBI11'
            : null
  const defaultMarkHref = defaultUnit ? edexcelMarkHref(defaultUnit) : edexcelMarkHref()
  const sampleSessions = defaultUnit
    ? getEdexcelIalSessionsForUnit(defaultUnit).slice(0, 6)
    : []
  const pastPapersGuideHref = edexcelSubjectPastPapersGuideHref(subject.slug)

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={copy.pastPapersPath}
        title={`Edexcel IAL ${subject.name} past papers`}
        description={`Unit-organised past-paper index for Edexcel IAL ${subject.name}.`}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Edexcel', path: edexcelRootPath() },
          { name: subject.name, path: edexcelSubjectPath(qualification, subjectSlug) },
          { name: 'Past papers', path: copy.pastPapersPath },
        ]}
      />
      <MarketingHero
        label={`${subject.familyCode} · Past papers`}
        title={`${subject.name} past papers`}
        lead={
          markingLive
            ? `Edexcel IAL ${subject.name} is modular. Use the unit + session map below to plan which papers to sit, then mark practice answers with board-native conventions.`
            : `Edexcel IAL ${subject.name} is modular. Use the unit map below to plan practice.`
        }
      />

      {sampleSessions.length > 0 ? (
        <MarketingSection>
          <h2 className="ms-h2">Recent IAL series</h2>
          <p className="ms-body-2 mb-4 text-[var(--ec-text-secondary)]">
            January, June and October sittings (2022–2025). We do not host Pearson PDFs
            here — open your paper, write an answer, then mark it on MarkScheme.
          </p>
          <ul className="flex list-none flex-wrap gap-2 p-0">
            {sampleSessions.map((s) => (
              <li
                key={s.label}
                className="rounded border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface))] px-3 py-1 font-mono text-xs font-semibold tracking-wide text-[var(--ec-text-secondary)] shadow-[var(--ec-shadow-hard,2px_2px_0_rgba(0,0,0,0.05))]"
              >
                {s.label}
              </li>
            ))}
            <li className="rounded border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface))] px-3 py-1 font-mono text-xs font-semibold tracking-wide text-[var(--ec-text-secondary)] shadow-[var(--ec-shadow-hard,2px_2px_0_rgba(0,0,0,0.05))]">
              + earlier series
            </li>
          </ul>
        </MarketingSection>
      ) : null}

      <MarketingSection>
        <h2 className="ms-h2">Units</h2>
        <ul className="ms-board-index">
          {subject.units.map((u) => {
            const canMark = markable.has(u.code)
            const sessions = getEdexcelIalSessionsForUnit(u.code)
            return (
              <li key={u.code}>
                <Link
                  href={edexcelUnitPath(qualification, subjectSlug, u.code)}
                  className="ms-board-slip"
                >
                  <span className="ms-board-slip__code">{u.code}</span>
                  <span className="ms-board-slip__body">
                    <span className="ms-board-slip__name">{u.name}</span>
                    <span className="ms-board-slip__meta">
                      {sessions.length > 0
                        ? `${sessions.length} series · Jan / June / Oct`
                        : u.short}
                      {canMark ? ' · Marking live' : ''}
                    </span>
                  </span>
                  <span className="ms-board-slip__go" aria-hidden>
                    -&gt;
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="ms-board-cross mt-8">
          <p className="ms-overline">Practice loop</p>
          <h2 className="ms-h2">Worked a paper?</h2>
          <p className="ms-body-2 mt-2 max-w-xl text-[var(--ec-text-secondary)]">
            {pastPapersGuideHref ? (
              <>
                How to run a unit practice loop:{' '}
                <Link href={pastPapersGuideHref} className="ec-link">
                  IAL {subject.name} past papers guide
                </Link>
                .{' '}
              </>
            ) : null}
            {markingLive
              ? `Mark with board-native conventions for IAL ${subject.name}.`
              : 'Open the Edexcel mark picker for live IAL STEM units.'}
          </p>
          <div className="mt-5">
            <Link
              href={defaultMarkHref}
              className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2"
            >
              <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                M1
              </span>
              Mark an Edexcel answer -&gt;
            </Link>
          </div>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
