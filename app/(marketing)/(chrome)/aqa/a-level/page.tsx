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
import { aqaRootPath, aqaSubjectPath } from '@/lib/seo/aqa-graph'

export const metadata = createPageMetadata({
  title: 'AQA A-level — Maths & Physics',
  description:
    'Selective UK AQA A-level hubs for Mathematics and Physics — practice marking with AQA method/accuracy dialect.',
  path: '/aqa/a-level',
  keywords: ['AQA A-level', 'AQA Mathematics', 'AQA Physics'],
})

/** Qualification hub — lives under /aqa, not under /edexcel. */
export default function AqaALevelPage() {
  const subjects = getAqaSubjects()
  return (
    <MarketingPageShell>
      <PageJsonLd
        path="/aqa/a-level"
        title="AQA A-level"
        description="Selective UK AQA A-level Maths and Physics."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'AQA', path: aqaRootPath() },
          { name: 'A-level', path: '/aqa/a-level' },
        ]}
      />
      <MarketingHero
        label="AQA"
        title="A-level"
        lead="Selective shell — Mathematics and Physics first. Mark practice answers with AQA point/method conventions."
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={aqaMarkHref('aqa-mathematics')}
            className="ec-btn-primary inline-flex min-h-[48px] items-center"
          >
            Mark AQA Maths -&gt;
          </Link>
          <Link href={aqaRootPath()} className="ec-btn-ghost inline-flex min-h-[48px] items-center">
            AQA hub
          </Link>
        </div>
      </MarketingHero>
      <MarketingSection>
        <h2 className="ms-h2">Subjects</h2>
        <ul className="ms-board-index">
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
