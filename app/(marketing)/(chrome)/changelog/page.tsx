import Link from 'next/link'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { itemListNode } from '@/lib/seo/structured-data'
import { CHANGELOG_ENTRIES } from '@/lib/seo/changelog'
import { SITE_URL } from '@/lib/site-config'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'

export const metadata = getPageMetadata('/changelog')

export default function ChangelogPage() {
  return (
    <MarketingPageShell>
      <PageJsonLd
        path="/changelog"
        title="MarkScheme product changelog"
        description="Shipped features: Cambridge & IB marking, free courses, Exam Room, teacher classrooms, and GEO documentation."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Changelog', path: '/changelog' },
        ]}
      />
      <JsonLd
        data={itemListNode({
          name: 'MarkScheme product changelog',
          description: 'Major releases for Cambridge and IB past-paper marking.',
          items: CHANGELOG_ENTRIES.map((entry) => ({
            name: `${entry.date}: ${entry.title}`,
            url: `${SITE_URL}/changelog`,
          })),
        })}
      />
      <MarketingHero
        label="CHANGELOG"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Changelog', path: '/changelog' },
        ]}
        title="What we ship"
        lead="Indexable product updates for students, teachers, and AI citation. For press facts see /research."
      />
      <MarketingSection className="!pt-0">
        <div className="mx-auto max-w-3xl">
          <aside className="ms-board-cross mb-10">
            <p className="ms-overline">Quick answer</p>
            <p className="ms-body-2 mt-2 text-[var(--ec-text-primary)]">
              <strong>MarkScheme</strong> (markscheme.app) ships Cambridge &amp; IB past-paper marking from
              handwriting, free syllabus courses, Exam Room communities, teacher classroom analytics, and
              open marking insights — this page lists major releases newest first.
            </p>
          </aside>

          <ol className="ms-changelog-ledger">
            {CHANGELOG_ENTRIES.map((entry) => (
              <li key={`${entry.date}-${entry.title}`} className="ms-changelog-ledger__item">
                <time dateTime={entry.date} className="ms-changelog-ledger__date">
                  {entry.date}
                </time>
                <h2 className="ms-changelog-ledger__title">{entry.title}</h2>
                <p className="ms-changelog-ledger__summary">{entry.summary}</p>
                <ul className="ms-changelog-ledger__tags">
                  {entry.tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>

          <div className="ms-board-cross mt-12">
            <p className="ms-overline">Next</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/mark"
                className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2"
              >
                <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                  M1
                </span>
                Open marking desk -&gt;
              </Link>
              <Link href="/research" className="ec-btn-ghost inline-flex min-h-[48px]">
                Press &amp; methodology
              </Link>
            </div>
          </div>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
