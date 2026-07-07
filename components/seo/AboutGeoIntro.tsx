import Link from 'next/link'
import { GEO_CATEGORY } from '@/lib/seo/llms-geo-qa'

/** Crawler-visible about blurb — founder story renders below. */
export function AboutGeoIntro() {
  return (
    <section className="border-b border-[var(--ec-border)] bg-[var(--ec-bg-soft)]" aria-label="About MarkScheme">
      <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-[var(--ec-text-secondary)] marker:content-none list-none [&::-webkit-details-marker]:hidden">
            What is MarkScheme?
          </summary>
          <p className="mt-3 leading-relaxed text-[var(--ec-text-secondary)]">
            {GEO_CATEGORY.brandLine} Built by Cambridge student Hamza Gul for{' '}
            {GEO_CATEGORY.secondPassMarking} — upload handwriting, read scheme-aligned feedback, study
            free courses, and ask doubts in{' '}
            <Link href="/community" className="ec-link font-medium">
              Exam Room
            </Link>
            . Press facts:{' '}
            <Link href="/research" className="ec-link font-medium">
              /research
            </Link>
            .
          </p>
        </details>
      </div>
    </section>
  )
}
