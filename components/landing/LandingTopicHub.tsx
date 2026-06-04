import Link from 'next/link'
import { ArrowRight, Layers } from 'lucide-react'
import { CONTENT_CLUSTERS } from '@/lib/seo/clusters'

/** Homepage topical authority — ≤3 clicks to every cluster hub. */
export function LandingTopicHub() {
  const featured = CONTENT_CLUSTERS.filter((c) =>
    ['past-paper-marking', 'mark-schemes', 'subject-guides', 'exam-integrity'].includes(c.id)
  )

  return (
    <section className="landing-section scroll-mt-20" aria-labelledby="topic-hub-heading">
      <div className="mx-auto max-w-3xl text-center">
        <p className="ec-label-tech mb-3">TOPICAL GUIDES</p>
        <h2 id="topic-hub-heading" className="landing-h2 text-[var(--ec-text-primary)]">
          Every revision topic, one hub
        </h2>
        <p className="landing-lead mt-4">
          Pillar pages plus supporting articles — built for how students actually search
          (how-tos, comparisons, syllabus codes).
        </p>
      </div>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {featured.map((c) => (
          <li key={c.id}>
            <Link
              href={c.path}
              className="ec-card ec-card-interactive flex h-full flex-col p-5"
            >
              <Layers className="h-4 w-4 text-[var(--ec-brand)]" aria-hidden />
              <span className="mt-3 font-semibold text-[var(--ec-text-primary)]">
                {c.title}
              </span>
              <span className="mt-2 flex-1 text-sm text-[var(--ec-text-secondary)]">
                {c.headTerm}
              </span>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--ec-brand)]">
                Open hub <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-center">
        <Link href="/guides" className="ec-btn-secondary inline-flex min-h-[48px]">
          All topic guides <ArrowRight className="h-5 w-5" />
        </Link>
      </p>
    </section>
  )
}
