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
import { OXFORD_AQA_HUB_GUIDE_LINKS } from '@/lib/edexcel/seo-guides'

const copy = buildOxfordaqaHubCopy()

export const metadata = createPageMetadata({
  title: copy.title,
  description: copy.description,
  path: copy.path,
  keywords: copy.keywords,
})

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
      />

      <MarketingSection className="!pt-0">
        <div className="flex flex-wrap gap-3">
          <Link href="/edexcel" className="ec-btn-primary inline-flex min-h-[48px]">
            Marking live on Edexcel IAL →
          </Link>
          <Link href="/results-2026/edexcel" className="ec-btn-ghost inline-flex min-h-[48px]">
            Results Day — Edexcel path
          </Link>
          <Link href="/caie" className="ec-btn-ghost inline-flex min-h-[48px]">
            Cambridge syllabus graph
          </Link>
        </div>
        <ul className="mt-6 grid list-none gap-2 p-0 sm:grid-cols-2">
          {OXFORD_AQA_HUB_GUIDE_LINKS.map((g) => (
            <li key={g.href}>
              <Link href={g.href} className="ec-card block p-3 text-sm font-semibold">
                {g.label} →
              </Link>
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection>
        <h2 className="ms-h2">Qualifications</h2>
        <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
          {quals.map((q) => (
            <li key={q.slug}>
              <Link
                href={oxfordaqaQualificationPath(q.slug)}
                className="ec-card flex h-full items-center justify-between gap-3 p-4"
              >
                <span>
                  <span className="font-semibold">{q.label}</span>
                  <span className="ms-micro mt-1 block uppercase tracking-wide">
                    {q.shortLabel}
                  </span>
                  <span className="ms-body-2 mt-2 block">{q.blurb}</span>
                </span>
                <span className="h-4 w-4 shrink-0 opacity-60" aria-hidden>-&gt;</span>
              </Link>
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection>
        <h2 className="ms-h2">IAL subjects on the shell</h2>
        <ul className="grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {ialSubjects.map((s) => (
            <li key={s.slug}>
              <Link
                href={oxfordaqaSubjectPath(s.qualification, s.slug)}
                className="ec-card flex h-full flex-col justify-between gap-2 p-4"
              >
                <span>
                  <span className="font-semibold">{s.name}</span>
                  <span className="ms-micro mt-1 block uppercase tracking-wide">
                    Wave {s.markingWave}
                  </span>
                </span>
                <span className="ms-body-2 line-clamp-3">{s.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
      </MarketingSection>
    </MarketingPageShell>
  )
}
