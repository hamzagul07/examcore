import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { CONTENT_CLUSTERS } from '@/lib/seo/clusters'

const GUIDE_LABELS: Record<string, { eyebrow: string; title: string }> = {
  'past-paper-marking': {
    eyebrow: 'Mark Cambridge past papers',
    title: 'Past paper marking',
  },
  'mark-schemes': {
    eyebrow: 'Cambridge mark scheme',
    title: 'Mark schemes & examiner language',
  },
  'subject-guides': {
    eyebrow: 'Cambridge subject past papers',
    title: 'Syllabus past paper guides',
  },
  'exam-integrity': {
    eyebrow: 'Cambridge exams 2026',
    title: 'Exam integrity & 2026 series',
  },
  ib: {
    eyebrow: 'IB past papers',
    title: 'IB Diploma guides',
  },
}

/** Homepage topical authority — guide cards from paper design. */
export function LandingTopicHub() {
  const featured = CONTENT_CLUSTERS.filter((c) =>
    ['past-paper-marking', 'mark-schemes', 'subject-guides', 'exam-integrity', 'ib'].includes(c.id)
  )

  return (
    <section className="landing-section scroll-mt-20 bg-[var(--ec-surface-raised)]" aria-labelledby="topic-hub-heading">
      <div className="mx-auto max-w-[42rem]">
        <span className="ec-eyebrow mb-4 block">Topical guides</span>
        <h2 id="topic-hub-heading" className="landing-h2">
          Every revision topic, <em>one hub</em>.
        </h2>
        <p className="landing-lead mt-4">
          Pillar pages plus supporting articles — built for how students actually search.
        </p>
      </div>
      <ul className="mt-12 grid list-none gap-4 p-0 sm:grid-cols-2">
        {featured.map((c) => {
          const labels = GUIDE_LABELS[c.id] ?? { eyebrow: c.headTerm, title: c.title }
          return (
            <li key={c.id}>
              <Link
                href={c.path}
                className="flex items-center justify-between gap-5 rounded-xl border border-[var(--ec-border)] bg-[var(--ec-surface)] p-6 transition-[border-color,transform,box-shadow] duration-180 hover:-translate-y-0.5 hover:border-[var(--ec-brand)] hover:shadow-[var(--ec-shadow-paper)]"
              >
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--ec-text-faint,#8a7f70)]">
                    {labels.eyebrow}
                  </div>
                  <h3 className="mt-1 text-[21px] font-bold tracking-[-0.01em] text-[var(--ec-text-primary)]">
                    {labels.title}
                  </h3>
                </div>
                <span className="shrink-0 font-mono text-[var(--ec-brand)]">→</span>
              </Link>
            </li>
          )
        })}
      </ul>
      <p className="mt-8 text-center">
        <Link href="/guides" className="ec-btn-secondary inline-flex">
          All topic guides <ArrowRight className="h-5 w-5" />
        </Link>
      </p>
    </section>
  )
}
