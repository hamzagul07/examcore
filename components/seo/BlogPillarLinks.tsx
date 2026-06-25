import Link from 'next/link'
import {
  SEO_IB_PILLAR_LINKS,
  SEO_IB_SUBJECT_LINKS,
  SEO_PILLAR_LINKS,
  SEO_SUBJECT_LINKS,
} from '@/lib/seo/pillar-links'
import { getClusterForSlug } from '@/lib/seo/clusters'

type Props = {
  slug?: string
  showSubjects?: boolean
}

/** Internal links for crawl depth + topical authority. */
export function BlogPillarLinks({ slug, showSubjects = true }: Props) {
  const isIb = slug ? getClusterForSlug(slug).id === 'ib' : false
  const pillars = isIb ? SEO_IB_PILLAR_LINKS : SEO_PILLAR_LINKS
  const subjects = isIb ? SEO_IB_SUBJECT_LINKS : SEO_SUBJECT_LINKS

  return (
    <aside className="ms-blog-aside mt-14">
      <p className="ms-overline">Explore Markscheme</p>
      <h2 className="ms-h3" style={{ marginTop: 8 }}>
        {isIb ? 'Popular IB guides & tools' : 'Popular guides & tools'}
      </h2>
      <p className="ms-body-2" style={{ marginTop: 8 }}>
        {isIb
          ? 'Internal links to IB past papers, free courses, topic practice, and criterion marking.'
          : 'Internal links to our core revision resources — built for Cambridge A-Level and O-Level.'}
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {pillars.map((link) => (
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
          <p className="ms-overline mt-8">{isIb ? 'Subject revision guides' : 'Syllabus guides'}</p>
          <ul className="ms-hub-strip mt-2">
            {subjects.map((link) => (
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
