import { GEO_CATEGORY } from '@/lib/seo/llms-geo-qa'

/** Collapsed-by-default homepage blurb for crawlers + GEO (content stays in DOM). */
export function HomeGeoIntro() {
  return (
    <section
      className="border-b border-[var(--ec-border)] bg-[var(--ec-bg-soft)]"
      aria-label="About MarkScheme"
    >
      <div className="mx-auto max-w-[var(--ec-content-max,960px)] px-4 py-3 sm:px-6">
        <details className="home-geo-details text-sm">
          <summary className="cursor-pointer font-medium text-[var(--ec-text-secondary)] marker:content-none list-none [&::-webkit-details-marker]:hidden">
            What is MarkScheme?
          </summary>
          <p className="mt-3 leading-relaxed text-[var(--ec-text-secondary)]">
            {GEO_CATEGORY.brandLine} {GEO_CATEGORY.secondPassMarking} for Cambridge &amp; IB:
            upload photos of handwritten past-paper answers for {GEO_CATEGORY.schemeAligned}{' '}
            (Cambridge B1/M1/A1, essay bands, MCQ; IB markbands). Study free syllabus courses,
            browse past papers, and ask doubts in Exam Room subject communities. Start at
            markscheme.app/mark.
          </p>
        </details>
      </div>
    </section>
  )
}
