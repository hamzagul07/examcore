import Link from 'next/link'
import type { CSSProperties } from 'react'
import { createPageMetadata } from '@/lib/seo/metadata'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { collectionPageNode, itemListNode } from '@/lib/seo/structured-data'
import { SITE_URL } from '@/lib/site-config'
import { getIbSubjects, getIbSubjectsByGroup } from '@/lib/ib/catalog'
import { ibShortName } from '@/lib/seo/ib-seo'

const PATH = '/ib/subjects'

export function generateMetadata() {
  return createPageMetadata({
    title: 'IB Diploma Subjects (HL & SL) — Full List',
    description:
      'The full list of IB Diploma Programme subjects by group, at Higher Level and Standard Level — with past papers, mark schemes and revision guidance for each. Free on MarkScheme.',
    path: PATH,
    keywords: ['IB subjects', 'IB Diploma subjects', 'IB HL SL subjects', 'IB subject list', 'IBDP subjects'],
  })
}

export default function IbSubjectsPage() {
  const subjects = getIbSubjects()
  const grouped = getIbSubjectsByGroup()

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={PATH}
        title="IB Diploma Subjects (HL & SL)"
        description="The full list of IB Diploma subjects by group, at Higher and Standard Level."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'IB', path: '/ib' },
          { name: 'Subjects', path: PATH },
        ]}
      />
      <JsonLd
        data={[
          collectionPageNode({
            path: PATH,
            name: 'IB Diploma Subjects',
            description: 'Every IB Diploma Programme subject at HL and SL, grouped by IB group.',
            hasPart: subjects.map((s) => ({
              name: `IB ${ibShortName(s)} ${s.level}`,
              url: `${SITE_URL}/ib/subjects/${s.slug}`,
            })),
          }),
          itemListNode({
            name: 'IB Diploma subjects',
            items: subjects.map((s) => ({
              name: `IB ${s.name} ${s.level}`,
              url: `${SITE_URL}/ib/subjects/${s.slug}`,
            })),
          }),
        ]}
      />

      <div className="ms-pg ms-subjects-page" style={{ paddingTop: 48 } as CSSProperties}>
        <Link href="/ib" className="ec-btn-underline text-[15px]">
          ← IB home
        </Link>
        <h1 className="ms-h2" style={{ margin: '8px 0 8px' }}>
          IB Diploma subjects
        </h1>
        <p className="ms-lead" style={{ maxWidth: '46ch' }}>
          Every IBDP subject by group, at Higher Level and Standard Level. Pick one for past papers,
          mark-scheme guidance and revision help.
        </p>

        {grouped.map((g) => (
          <section key={g.group} style={{ marginTop: 36 }} aria-labelledby={`g-${g.groupNumber}`}>
            <h2 id={`g-${g.groupNumber}`} className="ms-h3" style={{ marginBottom: 14 }}>
              Group {g.groupNumber} · {g.group}
            </h2>
            <ul className="ms-pp-grid">
              {g.subjects.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/ib/subjects/${s.slug}`}
                    className="ms-pp-card subject-accented"
                    style={{ '--acc': s.accent } as CSSProperties}
                  >
                    <span className="ms-pp-glyph" aria-hidden>
                      {s.glyph}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="ms-pp-title">
                        {s.name} <em className="ms-pp-code">· {s.level}</em>
                      </span>
                      <span className="ms-pp-meta">{s.papers.join(' · ')}</span>
                    </span>
                    <span className="ms-pp-cta" aria-hidden>
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </MarketingPageShell>
  )
}
