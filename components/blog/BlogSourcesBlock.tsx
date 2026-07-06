import Link from 'next/link'
import { isIbGuideSlug } from '@/lib/seo/subject-guides'

const CAMBRIDGE_SOURCES = [
  {
    label: 'Cambridge International — past papers',
    href: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-advanced/cambridge-international-as-and-a-levels/subjects/',
  },
  {
    label: 'Cambridge mark schemes (via school / official portals)',
    href: 'https://www.cambridgeinternational.org/',
  },
]

const IB_SOURCES = [
  {
    label: 'International Baccalaureate — programme guides',
    href: 'https://www.ibo.org/programmes/diploma-programme/',
  },
  {
    label: 'IB subject briefs & assessment information',
    href: 'https://www.ibo.org/programmes/diploma-programme/assessment-and-exams/',
  },
]

type Props = {
  slug?: string
  extra?: { label: string; href: string }[]
}

/** E-E-A-T: primary source citations for YMYL-adjacent exam content. */
export function BlogSourcesBlock({ slug, extra = [] }: Props) {
  const isIb = slug ? isIbGuideSlug(slug) : false
  const base = isIb ? IB_SOURCES : CAMBRIDGE_SOURCES
  const sources = [...base, ...extra]

  return (
    <section className="mt-12 border-t border-[var(--ec-border)] pt-8" aria-labelledby="sources-heading">
      <h2 id="sources-heading" className="ms-h3">
        Sources
      </h2>
      <ul className="mt-4 space-y-2">
        {sources.map((s) => (
          <li key={s.href}>
            <a
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="ec-btn-underline text-sm"
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
      <p className="ms-micro mt-4">
        {isIb ? (
          <>
            MarkScheme is not affiliated with the International Baccalaureate. Programme
            guides and assessment criteria are used for educational purposes. See our{' '}
          </>
        ) : (
          <>
            MarkScheme is not affiliated with Cambridge International. Syllabus codes and
            mark schemes are used for educational purposes. See our{' '}
          </>
        )}
        <Link href="/about" className="ec-btn-underline">
          about page
        </Link>{' '}
        for how we mark.
      </p>
    </section>
  )
}
