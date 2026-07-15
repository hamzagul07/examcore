import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getClusterForSlug } from '@/lib/seo/clusters'
import { MONEY_PAGES } from '@/lib/seo/internal-sculpt'
import {
  cambridgeSubjectLinkForSlug,
  ibTopicPracticeLinkForSlug,
} from '@/lib/seo/blog-subject-links'

type Props = { slug: string }

/**
 * Reasonable Surfer — high click-probability in-content links (not footer boilerplate).
 */
export function BlogInContentLinks({ slug }: Props) {
  const cluster = getClusterForSlug(slug)
  const isIb = cluster.id === 'ib'
  const primaryHref = isIb ? '/mark' : MONEY_PAGES[0]
  const primaryLabel = isIb ? 'Criterion marking' : 'Mark a question'
  const hubLabel = isIb ? 'IB Diploma hub' : `${cluster.title} hub`
  // Link down to the subject hub so ~200 syllabus-coded posts stop orphaning
  // their /subjects/[code] and /ib topic-practice pages.
  const ibTopicPractice = isIb ? ibTopicPracticeLinkForSlug(slug) : null
  const cambridgeSubject = isIb ? null : cambridgeSubjectLinkForSlug(slug)

  return (
    <nav className="ms-blog-cta-block my-8" aria-label="Primary actions">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="ms-h3" style={{ fontSize: '1.05rem' }}>
            {isIb
              ? 'Practise criterion marking while this guide is fresh'
              : 'Mark your paper while this guide is fresh'}
          </p>
          <p className="ms-body-2" style={{ marginTop: 6 }}>
            {isIb
              ? 'Band-by-band IB feedback — or drill a syllabus point with topic practice'
              : 'In-content link — fastest path to scheme-aligned feedback'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={primaryHref} className="ec-btn-primary inline-flex min-h-[44px] text-sm">
            {primaryLabel} <ArrowRight className="h-4 w-4" />
          </Link>
          {ibTopicPractice ? (
            <Link
              href={ibTopicPractice}
              className="ec-btn-secondary inline-flex min-h-[44px] text-sm"
            >
              Topic practice
            </Link>
          ) : null}
          {cambridgeSubject ? (
            <Link
              href={cambridgeSubject.href}
              className="ec-btn-secondary inline-flex min-h-[44px] text-sm"
            >
              Practise {cambridgeSubject.code} by topic
            </Link>
          ) : null}
          <Link
            href={cluster.path}
            className="ec-btn-secondary inline-flex min-h-[44px] text-sm"
          >
            {hubLabel}
          </Link>
        </div>
      </div>
    </nav>
  )
}
