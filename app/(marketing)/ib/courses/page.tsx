import Link from 'next/link'
import { createPageMetadata } from '@/lib/seo/metadata'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { collectionPageNode, itemListNode } from '@/lib/seo/structured-data'
import { SITE_URL } from '@/lib/site-config'
import { HubSeoIntro } from '@/components/seo/HubSeoIntro'
import { ibCatalogCardsByTrack } from '@/lib/courses/ib-catalog-display'
import { getIbCatalogCards } from '@/lib/courses/ib-catalog-display.server'
import { buildIbCoursesIndexSeo } from '@/lib/seo/ib-course-seo'
import { SubjectCard } from '@/components/courses/margin-notes/SubjectCard'

const PATH = '/ib/courses'

export function generateMetadata() {
  const cards = getIbCatalogCards()
  const lessonCount = cards.reduce((a, c) => a + c.lessons, 0)
  const seo = buildIbCoursesIndexSeo(cards.length, lessonCount)
  return createPageMetadata({
    title: seo.title,
    description: seo.description,
    path: PATH,
    keywords: seo.keywords,
    ogImagePath: '/ib/opengraph-image',
  })
}

export default function IbCoursesIndexPage() {
  const cards = getIbCatalogCards()
  const tracks = ibCatalogCardsByTrack(cards)
  const lessonCount = cards.reduce((a, c) => a + c.lessons, 0)
  const seo = buildIbCoursesIndexSeo(cards.length, lessonCount)

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={PATH}
        title={seo.title}
        description={seo.description}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'IB', path: '/ib' },
          { name: 'Free courses', path: PATH },
        ]}
      />
      <JsonLd
        data={[
          collectionPageNode({
            path: PATH,
            name: 'Free IB Diploma courses',
            description: seo.description,
            hasPart: cards.map((c) => ({
              name: `IB ${c.name} ${c.level}`,
              url: `${SITE_URL}${c.href}`,
            })),
          }),
          itemListNode({
            name: 'IB Diploma free courses by track',
            items: cards.map((c) => ({
              name: `IB ${c.name} ${c.level}`,
              url: `${SITE_URL}${c.href}`,
              description: `${c.lessons} lessons`,
            })),
          }),
        ]}
      />

      <main className="catalog-page ec-page-mesh" data-screen-label="IB — courses catalog">
        <header className="catalog-hero pg">
          <div className="catalog-hero-text">
            <p className="overline">IB Diploma · 100% free</p>
            <h1 className="h-display">
              Free IB courses,
              <br />
              <em>topic by topic.</em>
            </h1>
            <p className="lead catalog-lead">
              TOK, Extended Essay, CAS, sciences, maths, and Group 6 arts — every syllabus topic
              with worked examples, markband tips, and criterion practice marking.
            </p>
          </div>
          <div className="catalog-hero-meta">
            <div className="hero-stat">
              <b>{cards.length}</b>
              <span>subjects</span>
            </div>
            <div className="hero-stat">
              <b>{lessonCount.toLocaleString()}</b>
              <span>lessons</span>
            </div>
            <div className="hero-stat">
              <b>IB</b>
              <span>criterion marking</span>
            </div>
          </div>
        </header>

        <div className="pg">
          <HubSeoIntro
            heading="Syllabus-aligned IB revision — with marking built in"
            paragraph="Each course follows the current IB Diploma syllabus topic by topic. Learn the content with visual lessons and flashcards, then practise with criterion-based marking that scores band-by-band against official assessment criteria — not a generic AI grade."
            links={[
              { href: '/ib', label: 'IB past papers hub', variant: 'muted' },
              { href: '/courses', label: 'Cambridge courses', variant: 'muted' },
              { href: '/guides/ib', label: 'IB study guide', variant: 'muted' },
              { href: '/mark', label: 'Criterion practice →', variant: 'primary' },
            ]}
          />

          {(
            [
              { key: 'core', label: 'Core — TOK, EE & CAS', items: tracks.core },
              { key: 'arts', label: 'Group 6 — The Arts', items: tracks.arts },
              { key: 'stem', label: 'Sciences, maths & humanities', items: tracks.stem },
            ] as const
          )
            .filter((t) => t.items.length > 0)
            .map((track) => (
              <section key={track.key} className="catalog-ib-section" aria-labelledby={`ib-track-${track.key}`}>
                <h2 id={`ib-track-${track.key}`} className="h3 catalog-ib-title">
                  {track.label}
                </h2>
                <div className="catalog-grid">
                  {track.items.map((s) => (
                    <SubjectCard
                      key={s.code}
                      s={s}
                      href={s.href}
                      boardLabel={s.boardLabel}
                      accentHex={s.accentHex}
                      statSuffix="criterion practice tasks"
                    />
                  ))}
                </div>
              </section>
            ))}

          <nav className="catalog-footnote" aria-label="Related">
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/ib/subjects" className="ec-btn-ghost sm">
                All IB subjects →
              </Link>
              <Link href="/ib/past-papers" className="ec-btn-ghost sm">
                IB past papers →
              </Link>
              <Link href="/courses" className="ec-btn-ghost sm">
                Cambridge courses →
              </Link>
            </div>
          </nav>
        </div>
      </main>
    </MarketingPageShell>
  )
}
