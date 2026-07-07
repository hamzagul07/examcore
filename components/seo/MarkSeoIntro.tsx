import Link from 'next/link'
import { HubSeoIntro } from '@/components/seo/HubSeoIntro'
import { MARK_SEO_FAQ, MARK_SEO_INTRO } from '@/lib/seo/mark-seo'

/** Crawler-visible intro + FAQ on /mark (client app renders below). Collapsed by default on small screens. */
export function MarkSeoIntro() {
  return (
    <div className="mark-seo-shell border-b border-[var(--ec-border)] bg-[var(--ec-bg-soft)]">
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6">
        <h1 className="sr-only">Mark Cambridge and IB past papers online — MarkScheme</h1>
        <details className="mark-seo-details group">
          <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--ec-text-primary)] marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="underline decoration-[var(--ec-border)] underline-offset-2 group-open:no-underline">
              About MarkScheme marking (Cambridge &amp; IB)
            </span>
          </summary>
          <div className="mt-4">
            <HubSeoIntro
              id="mark-seo-intro"
              heading={MARK_SEO_INTRO.heading}
              paragraph={MARK_SEO_INTRO.paragraph}
              links={[...MARK_SEO_INTRO.links]}
              headingLevel="h2"
            />
            <section className="mark-seo-faq mt-6" aria-labelledby="mark-seo-faq-heading">
              <h2
                id="mark-seo-faq-heading"
                className="mb-3 text-base font-semibold text-[var(--ec-text-primary)]"
              >
                Common questions
              </h2>
              <dl className="space-y-4">
                {MARK_SEO_FAQ.map((item) => (
                  <div key={item.q}>
                    <dt className="text-sm font-semibold text-[var(--ec-text-primary)]">{item.q}</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
                      {item.a}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-sm text-[var(--ec-text-secondary)]">
                More detail:{' '}
                <Link href="/faq" className="ec-link font-medium">
                  FAQ
                </Link>
                {' · '}
                <Link href="/how-it-works" className="ec-link font-medium">
                  How it works
                </Link>
                {' · '}
                <Link href="/research" className="ec-link font-medium">
                  Methodology
                </Link>
              </p>
            </section>
          </div>
        </details>
      </div>
    </div>
  )
}
