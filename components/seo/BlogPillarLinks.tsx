import Link from 'next/link'
import { SEO_PILLAR_LINKS, SEO_SUBJECT_LINKS } from '@/lib/seo/pillar-links'

type Props = {
  showSubjects?: boolean
}

/** Internal links for crawl depth + topical authority. */
export function BlogPillarLinks({ showSubjects = true }: Props) {
  return (
    <aside className="mt-14 rounded-2xl border border-[var(--ec-border)] bg-[var(--ec-surface)]/60 p-6 sm:p-8">
      <p className="ec-label-tech mb-2">EXPLORE MARKSCHEME</p>
      <h2 className="landing-h3 text-[var(--ec-text-primary)]">
        Popular guides &amp; tools
      </h2>
      <p className="mt-2 text-sm text-[var(--ec-text-secondary)]">
        Internal links to our core revision resources — built for Cambridge A-Level and
        O-Level.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {SEO_PILLAR_LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="ec-card ec-card-interactive block p-4"
            >
              <span className="text-sm font-semibold text-[var(--ec-text-primary)]">
                {link.label}
              </span>
              <span className="mt-1 block text-xs text-[var(--ec-text-secondary)]">
                {link.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {showSubjects && (
        <>
          <p className="ec-label-tech mb-3 mt-8">SYLLABUS GUIDES</p>
          <ul className="flex flex-wrap gap-2">
            {SEO_SUBJECT_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex rounded-full border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--ec-text-secondary)] transition-colors hover:border-[var(--ec-brand)]/40 hover:text-[var(--ec-brand)]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  )
}
