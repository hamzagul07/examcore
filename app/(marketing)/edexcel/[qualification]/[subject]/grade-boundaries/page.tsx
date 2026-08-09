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
import { edexcelMarkHref } from '@/lib/edexcel/marking'
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
    title: `Edexcel IAL ${subject.name} grade boundaries`,
    description: `UMS and raw mark grade-boundary reference for Edexcel International A Level ${subject.name} units (${subject.familyCode}).`,
    path: copy.boundariesPath,
    keywords: [
      `Edexcel IAL ${subject.name} grade boundaries`,
      `${subject.familyCode} UMS`,
      'Edexcel International A Level boundaries',
    ],
  })
}

export default async function EdexcelBoundariesPage({ params }: Props) {
  const { qualification, subject: subjectSlug } = await params
  const subject = resolveEdexcelSubject(qualification, subjectSlug)
  if (!subject) notFound()
  const qual = getEdexcelQualification(qualification)
  if (!qual) notFound()
  const copy = buildEdexcelSubjectCopy(subject)
  const isMaths = subject.slug === 'mathematics'
  const markingLive = subject.markingWave === 1 || subject.markingWave === 1.5
  const markHref =
    subject.slug === 'mathematics'
      ? edexcelMarkHref('WMA11')
      : subject.slug === 'physics'
        ? edexcelMarkHref('WPH11')
        : subject.slug === 'chemistry'
          ? edexcelMarkHref('WCH11')
          : subject.slug === 'biology'
            ? edexcelMarkHref('WBI11')
            : edexcelMarkHref()

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={copy.boundariesPath}
        title={`Edexcel IAL ${subject.name} grade boundaries`}
        description={`Grade-boundary hub for Edexcel IAL ${subject.name} (UMS).`}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Edexcel', path: edexcelRootPath() },
          { name: subject.name, path: edexcelSubjectPath(qualification, subjectSlug) },
          { name: 'Grade boundaries', path: copy.boundariesPath },
        ]}
      />
      <MarketingHero
        label={`${subject.familyCode} · UMS`}
        title={`${subject.name} grade boundaries`}
        lead="Edexcel IAL uses Uniform Mark Scale (UMS) across modular units. Know the cash-in rules, target the units that move your grade, then close the gap with examiner-style marking."
      />

      <MarketingSection>
        <h2 className="ms-h2">How UMS works (IAL)</h2>
        <ol className="ms-body-2 m-0 grid list-decimal gap-3 pl-5 text-[var(--ec-text-secondary)]">
          <li>
            Each unit paper is marked in <strong className="text-[var(--ec-text-primary)]">raw marks</strong>.
          </li>
          <li>
            Pearson converts raw marks to <strong className="text-[var(--ec-text-primary)]">UMS</strong> so
            different sessions stay comparable.
          </li>
          <li>
            Your qualification grade comes from the{' '}
            <strong className="text-[var(--ec-text-primary)]">UMS total</strong> across the units you cash
            in — not from a single linear paper set.
          </li>
        </ol>
        <p className="ms-body-2 mt-4 text-[var(--ec-text-secondary)]">
          Session-by-session A/B/C raw-mark tables will publish here as we add them. Until then,
          treat official Pearson boundary PDFs as the source of truth for a given series.
          {isMaths ? (
            <>
              {' '}
              Full walkthrough:{' '}
              <Link
                href="/blog/edexcel-ial-maths-grade-boundaries-ums-2026"
                className="ec-btn-underline"
              >
                Edexcel IAL Maths UMS guide
              </Link>
              .
            </>
          ) : null}
        </p>
      </MarketingSection>

      <MarketingSection>
        <h2 className="ms-h2">Units in this subject</h2>
        <ul className="ms-board-index">
          {subject.units.map((u) => (
            <li key={u.code}>
              <Link
                href={edexcelUnitPath(qualification, subjectSlug, u.code)}
                className="ms-board-slip"
              >
                <span className="ms-board-slip__code">{u.code}</span>
                <span className="ms-board-slip__body">
                  <span className="ms-board-slip__name">{u.name}</span>
                  <span className="ms-board-slip__meta">
                    {u.short}
                    {markingLive ? ' · Marking live' : ''}
                  </span>
                </span>
                <span className="ms-board-slip__go" aria-hidden>
                  -&gt;
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="ms-board-cross mt-8">
          <p className="ms-overline">Close the gap</p>
          <h2 className="ms-h2">Boundaries set the target. Marking finds the gap.</h2>
          <p className="ms-body-2 mt-2 max-w-lg text-[var(--ec-text-secondary)]">
            {markingLive
              ? `Upload a ${subject.familyCode} practice answer and get board-native feedback before the next sitting.`
              : 'IAL STEM marking is live on /mark for Maths, Physics, Chemistry and Biology.'}
          </p>
          <div className="mt-5">
            <Link
              href={markHref}
              className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2"
            >
              <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                M1
              </span>
              {markingLive
                ? `Mark IAL ${subject.name} -&gt;`
                : 'Open Edexcel marking -&gt;'}
            </Link>
          </div>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
