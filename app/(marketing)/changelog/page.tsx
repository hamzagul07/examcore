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
          <aside className="ec-blog-quick-answer mb-10 rounded-xl border border-[var(--ec-brand)]/25 bg-[var(--ec-brand)]/5 px-5 py-5">
            <p className="ec-label-tech mb-2 text-[var(--ec-brand)]">QUICK ANSWER</p>
            <p className="text-base font-medium leading-relaxed text-[var(--ec-text-primary)]">
              <strong>MarkScheme</strong> (markscheme.app) ships Cambridge &amp; IB past-paper marking from
              handwriting, free syllabus courses, Exam Room communities, teacher classroom analytics, and
              open marking insights ÿ this page lists major releases newest first.
            </p>
          </aside>

          <ol className="space-y-8 border-l-2 border-[var(--ec-border)] pl-6">
            {CHANGELOG_ENTRIES.map((entry) => (
              <li key={`${entry.date}-${entry.title}`} className="relative">
                <span
                  className="absolute -left-[calc(0.5rem+1px)] top-1.5 h-3 w-3 rounded-full bg-[var(--ec-brand)]"
                  aria-hidden
                />
                <time
                  dateTime={entry.date}
                  className="ec-label-tech text-[var(--ec-text-secondary)]"
                >
                  {entry.date}
                </time>
                <h2 className="landing-h3 mt-1 text-[var(--ec-text-primary)]">{entry.title}</h2>
                <p className="mt-2 leading-relaxed text-[var(--ec-text-secondary)]">{entry.summary}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {entry.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full border border-[var(--ec-border)] px-2.5 py-0.5 text-xs text-[var(--ec-text-secondary)]"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>

          <p className="landing-lead mt-12 text-center">
            Press &amp; methodology:{' '}
            <Link href="/research" className="ec-link">
              /research
            </Link>
            . Product:{' '}
            <Link href="/mark" className="ec-link">
              /mark
            </Link>
            .
          </p>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
