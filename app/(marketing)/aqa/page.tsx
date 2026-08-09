import Link from 'next/link'
import {
  MarketingHero,
  MarketingPageShell,
  MarketingSection,
} from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getAqaSubjects } from '@/lib/aqa/catalog'
import { aqaMarkHref } from '@/lib/aqa/marking'
import { AQA_HUB_GUIDE_LINKS } from '@/lib/aqa/seo-guides'
import { aqaSubjectPath } from '@/lib/seo/aqa-graph'

export const metadata = createPageMetadata({
  title: 'AQA A-level — Maths & Physics marking',
  description:
    'Selective UK AQA A-level shell for Mathematics and Physics — practise answers with method/accuracy marking on MarkScheme.',
  path: '/aqa',
  keywords: ['AQA A-level', 'AQA Mathematics', 'AQA Physics', 'AQA marking'],
})

export default function AqaHubPage() {
  const subjects = getAqaSubjects()
  return (
    <MarketingPageShell>
      <PageJsonLd
        path="/aqa"
        title="AQA A-level"
        description="Selective UK AQA A-level Maths and Physics on MarkScheme."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'AQA', path: '/aqa' },
        ]}
      />
      <MarketingHero
        label="UK A-level"
        title="AQA"
        lead="Selective shell — Mathematics and Physics first. Not a full GCSE catalogue. Mark practice answers with AQA method/accuracy dialect."
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={aqaMarkHref('aqa-mathematics')}
            className="ec-btn-primary inline-flex min-h-[48px] items-center"
          >
            Mark AQA Maths -&gt;
          </Link>
          <Link href="/edexcel/a-level" className="ec-btn-ghost inline-flex min-h-[48px] items-center">
            Edexcel UK A Level
          </Link>
        </div>
      </MarketingHero>
      <MarketingSection className="!pt-0">
        <p className="ms-overline">Guides</p>
        <ul className="ms-board-index ms-board-index--guides">
          {AQA_HUB_GUIDE_LINKS.map((g) => (
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
        <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
          {subjects.map((s) => (
            <li key={s.slug}>
              <Link href={aqaSubjectPath(s.slug)} className="ms-board-slip">
                <span className="ms-board-slip__code">{s.contentCode}</span>
                <span className="ms-board-slip__body">
                  <span className="ms-board-slip__name">{s.name}</span>
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
