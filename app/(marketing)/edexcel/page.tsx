import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
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
      />

      <MarketingSection className="!pt-0">
        <div className="flex flex-wrap gap-3">
          <Link
            href={edexcelMarkHref('WMA11')}
            className="ec-btn-primary inline-flex min-h-[48px]"
          >
            Mark IAL Maths (WMA11) →
          </Link>
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
        <ul className="mt-6 grid list-none gap-2 p-0 sm:grid-cols-2">
          {EDEXCEL_HUB_GUIDE_LINKS.map((g) => (
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
                href={edexcelQualificationPath(q.slug)}
                className="ec-card flex h-full items-center justify-between gap-3 p-4"
              >
                <span>
                  <span className="font-semibold">{q.label}</span>
                  <span className="ms-micro mt-1 block uppercase tracking-wide">
                    {q.shortLabel}
                  </span>
                  <span className="ms-body-2 mt-2 block">{q.blurb}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 opacity-60" />
              </Link>
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection>
        <h2 className="ms-h2">IAL subjects live on the shell</h2>
        <ul className="grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {ialSubjects.map((s) => (
            <li key={s.slug}>
              <Link
                href={edexcelSubjectPath(s.qualification, s.slug)}
                className="ec-card flex h-full flex-col justify-between gap-2 p-4"
              >
                <span>
                  <span className="font-semibold">{s.name}</span>
                  <span className="ms-micro mt-1 block uppercase tracking-wide">
                    {s.familyCode} · Wave {s.markingWave}
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
