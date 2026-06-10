import Link from 'next/link'
import { SEO_PILLAR_LINKS, SEO_SUBJECT_LINKS } from '@/lib/seo/pillar-links'

type Props = {
  showSubjects?: boolean
}

/** Internal links for crawl depth + topical authority. */
export function BlogPillarLinks({ showSubjects = true }: Props) {
  return (
    <aside className="ms-blog-aside mt-14">
      <p className="ms-overline">Explore Markscheme</p>
      <h2 className="ms-h3" style={{ marginTop: 8 }}>
        Popular guides &amp; tools
      </h2>
      <p className="ms-body-2" style={{ marginTop: 8 }}>
        Internal links to our core revision resources — built for Cambridge A-Level and
        O-Level.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {SEO_PILLAR_LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="ms-hub-card block p-4 transition-transform hover:-translate-y-0.5">
              <span className="text-sm font-semibold text-[var(--ec-text-primary)]">
                {link.label}
              </span>
              <span className="ms-micro mt-1 block">{link.description}</span>
            </Link>
          </li>
        ))}
      </ul>
      {showSubjects && (
        <>
          <p className="ms-overline mt-8">Syllabus guides</p>
          <ul className="ms-hub-strip mt-2">
            {SEO_SUBJECT_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="ec-chip-ms ec-chip-ms--outline">
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
