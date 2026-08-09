import Link from 'next/link'

import {
  MarketingHero,
  MarketingPageShell,
  MarketingSection,
} from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { createPageMetadata } from '@/lib/seo/metadata'
import {
  OXFORD_AQA_QUALIFICATIONS,
  getOxfordaqaSubjects,
} from '@/lib/oxfordaqa/catalog'
import {
  oxfordaqaQualificationPath,
  oxfordaqaSubjectPath,
} from '@/lib/seo/oxfordaqa-graph'
import { buildOxfordaqaHubCopy } from '@/lib/seo/oxfordaqa-seo'
import { OXFORD_AQA_HUB_GUIDE_LINKS } from '@/lib/oxfordaqa/seo-guides'

const copy = buildOxfordaqaHubCopy()

export const metadata = createPageMetadata({
  title: copy.title,
  description: copy.description,
  path: copy.path,
  keywords: copy.keywords,
})

function subjectStamp(slug: string) {
  return slug.slice(0, 4).toUpperCase()
}

export default function OxfordaqaHubPage() {
  const quals = OXFORD_AQA_QUALIFICATIONS.filter((q) => q.shellEnabled)
  const ialSubjects = getOxfordaqaSubjects('international-a-level')

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={copy.path}
        title={copy.title}
        description={copy.description}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'OxfordAQA', path: '/oxfordaqa' },
        ]}
      />
      <MarketingHero
        label="OxfordAQA"
        title="OxfordAQA International"
        lead="Paper maps, past-paper indexes and grade boundaries for International A-level — the same acquisition surface pattern as Edexcel, without a second product build. Marking stays off until Edexcel conversion justifies the next dialect."
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/edexcel"
            className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2"
          >
            <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
              M1
            </span>
            Marking live on Edexcel IAL -&gt;
          </Link>
          <Link href="/results-2026/edexcel" className="ec-btn-ghost inline-flex min-h-[48px]">
            Results Day — Edexcel path
          </Link>
          <Link href="/caie" className="ec-btn-ghost inline-flex min-h-[48px]">
            Cambridge syllabus graph
          </Link>
        </div>
      </MarketingHero>

      <MarketingSection className="!pt-0">
        <p className="ms-overline">Guides</p>
        <ul className="ms-board-index ms-board-index--guides">
          {OXFORD_AQA_HUB_GUIDE_LINKS.map((g) => (
            <li key={g.href}>
              <Link href={g.href} className="ms-board-slip ms-board-slip--compact">
                <span className="ms-board-slip__body">
                  <span className="ms-board-slip__name">{g.label}</span>
                </span>
                <span className="ms-board-slip__go" aria-hidden>
                  -&gt;
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection>
        <h2 className="ms-h2">Qualifications</h2>
        <ul className="ms-board-index">
          {quals.map((q) => (
            <li key={q.slug}>
              <Link
                href={oxfordaqaQualificationPath(q.slug)}
                className="ms-board-slip"
              >
                <span className="ms-board-slip__code">{q.shortLabel}</span>
                <span className="ms-board-slip__body">
                  <span className="ms-board-slip__name">{q.label}</span>
                  <span className="ms-board-slip__meta">{q.blurb}</span>
                </span>
                <span className="ms-board-slip__go" aria-hidden>
                  -&gt;
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection>
        <h2 className="ms-h2">IAL subjects on the shell</h2>
        <ul className="ms-board-index ms-board-index--4">
          {ialSubjects.map((s) => (
            <li key={s.slug}>
              <Link
                href={oxfordaqaSubjectPath(s.qualification, s.slug)}
                className="ms-board-slip"
              >
                <span className="ms-board-slip__code">{subjectStamp(s.slug)}</span>
                <span className="ms-board-slip__body">
                  <span className="ms-board-slip__name">{s.name}</span>
                  <span className="ms-board-slip__meta">Wave {s.markingWave}</span>
                  <span className="ms-board-slip__blurb">{s.blurb}</span>
                </span>
                <span className="ms-board-slip__go" aria-hidden>
                  -&gt;
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection>
        <div className="ms-board-cross">
          <p className="ms-overline">Also marking</p>
          <h2 className="ms-h2">Need handwriting marked today?</h2>
          <p className="ms-body-2 mt-2 max-w-2xl text-[var(--ec-text-secondary)]">
            OxfordAQA marking stays shelled until Edexcel IAL conversion proves the dialect
            path. Cambridge and Edexcel IAL Maths are live now.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/mark?board=edexcel&subject=WMA11"
              className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2"
            >
              <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                M1
              </span>
              Mark Edexcel IAL -&gt;
            </Link>
            <Link href="/caie" className="ec-btn-ghost inline-flex min-h-[48px]">
              Browse Cambridge hubs
            </Link>
          </div>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
