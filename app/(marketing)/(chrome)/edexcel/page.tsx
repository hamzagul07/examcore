import Link from 'next/link'
import { FunnelLandingView } from '@/components/analytics/FunnelLandingView'
import { FunnelMarkLink } from '@/components/analytics/FunnelMarkLink'
import {
  MarketingHero,
  MarketingPageShell,
  MarketingSection,
} from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { createPageMetadata } from '@/lib/seo/metadata'
import { EDEXCEL_QUALIFICATIONS, getEdexcelSubjects } from '@/lib/edexcel/catalog'
import { edexcelMarkHref } from '@/lib/edexcel/marking'
import { EDEXCEL_HUB_GUIDE_LINKS } from '@/lib/edexcel/seo-guides'
import {
  edexcelQualificationPath,
  edexcelSubjectPath,
} from '@/lib/seo/edexcel-graph'
import { buildEdexcelHubCopy } from '@/lib/seo/edexcel-seo'

const copy = buildEdexcelHubCopy()

export const metadata = createPageMetadata({
  title: copy.title,
  description: copy.description,
  path: copy.path,
  keywords: copy.keywords,
})

export default function EdexcelHubPage() {
  const quals = EDEXCEL_QUALIFICATIONS.filter((q) => q.shellEnabled)
  const ialSubjects = getEdexcelSubjects('international-a-level')

  return (
    <MarketingPageShell>
      <FunnelLandingView source="board_hub_edexcel" />
      <PageJsonLd
        path={copy.path}
        title={copy.title}
        description={copy.description}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Edexcel', path: '/edexcel' },
        ]}
      />
      <MarketingHero
        label="Pearson Edexcel"
        title="Edexcel International"
        lead="Unit maps, past-paper indexes and grade boundaries for International A Level — wired for examiner-style marking. Boards acquire students; marking is the product."
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <FunnelMarkLink
            href={edexcelMarkHref('WMA11')}
            source="board_hub_edexcel"
            board="edexcel"
            subject="WMA11"
            className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2"
          >
            <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
              M1
            </span>
            Mark IAL Maths (WMA11) -&gt;
          </FunnelMarkLink>
          <Link
            href="/blog/edexcel-ial-vs-cambridge-a-level-2026"
            className="ec-btn-ghost inline-flex min-h-[48px]"
          >
            Edexcel IAL vs Cambridge
          </Link>
          <Link href="/caie" className="ec-btn-ghost inline-flex min-h-[48px]">
            Studying Cambridge too?
          </Link>
        </div>
      </MarketingHero>

      <MarketingSection className="!pt-0">
        <p className="ms-overline">Guides</p>
        <ul className="ms-board-index ms-board-index--guides">
          {EDEXCEL_HUB_GUIDE_LINKS.map((g) => (
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
                href={edexcelQualificationPath(q.slug)}
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
        <h2 className="ms-h2">IAL subjects live on the shell</h2>
        <ul className="ms-board-index ms-board-index--4">
          {ialSubjects.map((s) => (
            <li key={s.slug}>
              <Link
                href={edexcelSubjectPath(s.qualification, s.slug)}
                className="ms-board-slip"
              >
                <span className="ms-board-slip__code">{s.familyCode}</span>
                <span className="ms-board-slip__body">
                  <span className="ms-board-slip__name">{s.name}</span>
                  <span className="ms-board-slip__meta">
                    Wave {s.markingWave}
                  </span>
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
    </MarketingPageShell>
  )
}
