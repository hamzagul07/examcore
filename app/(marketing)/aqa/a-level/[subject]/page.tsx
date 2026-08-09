import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  MarketingHero,
  MarketingPageShell,
  MarketingSection,
} from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getAqaSubject, getAqaSubjects } from '@/lib/aqa/catalog'
import { aqaMarkHref } from '@/lib/aqa/marking'
import { aqaRootPath, aqaSubjectPath } from '@/lib/seo/aqa-graph'
import { aqaRootPath, aqaSubjectPath } from '@/lib/seo/aqa-graph'

type Props = { params: Promise<{ subject: string }> }

export function generateStaticParams() {
  return getAqaSubjects().map((s) => ({ subject: s.slug }))
}

export async function generateMetadata({ params }: Props) {
  const { subject: slug } = await params
  const subject = getAqaSubject(slug)
  if (!subject) return {}
  return createPageMetadata({
    title: `AQA A-level ${subject.name} — mark & revise`,
    description: subject.blurb,
    path: aqaSubjectPath(subject.slug),
    keywords: [`AQA ${subject.name}`, 'AQA A-level', subject.contentCode],
  })
}

export default async function AqaSubjectPage({ params }: Props) {
  const { subject: slug } = await params
  const subject = getAqaSubject(slug)
  if (!subject) notFound()
  const markHref = aqaMarkHref(subject.contentCode)
  const path = aqaSubjectPath(subject.slug)

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={path}
        title={`AQA ${subject.name}`}
        description={subject.blurb}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'AQA', path: aqaRootPath() },
          { name: 'A-level', path: '/aqa/a-level' },
          { name: subject.name, path },
        ]}
      />
      <MarketingHero
        label="AQA A-level"
        title={subject.name}
        lead={subject.blurb}
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={markHref} className="ec-btn-primary inline-flex min-h-[48px] items-center">
            Mark an answer -&gt;
          </Link>
          <Link
            href={subject.slug === 'mathematics' ? '/courses/9709' : '/courses/9702'}
            className="ec-btn-ghost inline-flex min-h-[48px] items-center"
          >
            Overlapping Cambridge course
          </Link>
        </div>
      </MarketingHero>
      <MarketingSection>
        <ul className="grid list-none gap-3 p-0">
          <li>
            <Link href={markHref} className="ms-board-slip">
              <span className="ms-board-slip__code">M1</span>
              <span className="ms-board-slip__body">
                <span className="ms-board-slip__name">Mark with AQA dialect</span>
                <span className="ms-board-slip__blurb">
                  Practice and scanned scripts — method/accuracy conventions.
                </span>
              </span>
              <span className="ms-board-slip__go" aria-hidden>
                -&gt;
              </span>
            </Link>
          </li>
          <li>
            <Link href="/edexcel/international-a-level" className="ms-board-slip">
              <span className="ms-board-slip__code">IAL</span>
              <span className="ms-board-slip__body">
                <span className="ms-board-slip__name">International Edexcel instead?</span>
                <span className="ms-board-slip__blurb">
                  Modular IAL units with UMS — different from UK linear AQA papers.
                </span>
              </span>
              <span className="ms-board-slip__go" aria-hidden>
                -&gt;
              </span>
            </Link>
          </li>
        </ul>
      </MarketingSection>
    </MarketingPageShell>
  )
}
