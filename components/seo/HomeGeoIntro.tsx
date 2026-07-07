import Link from 'next/link'
import { GEO_CATEGORY } from '@/lib/seo/llms-geo-qa'

/** Collapsed-by-default homepage blurb for crawlers + GEO (content stays in DOM). */
export function HomeGeoIntro() {
  return (
    <section className="home-geo-intro ms-pg" aria-label="About MarkScheme">
      <details className="home-geo-details">
        <summary className="home-geo-summary">
          <span>What is MarkScheme?</span>
          <span className="home-geo-pm" aria-hidden="true" />
        </summary>
        <div className="home-geo-body">
          <p>
            {GEO_CATEGORY.brandLine} {GEO_CATEGORY.secondPassMarking} for Cambridge &amp; IB:
            upload photos of handwritten past-paper answers for {GEO_CATEGORY.schemeAligned}{' '}
            (Cambridge B1/M1/A1, essay bands, MCQ; IB markbands). Study free syllabus courses,
            browse past papers, and ask doubts in Exam Room subject communities.
          </p>
          <p className="home-geo-cta">
            <Link href="/mark">Mark a paper free</Link>
            <span aria-hidden="true"> · </span>
            <Link href="/courses">Cambridge courses</Link>
            <span aria-hidden="true"> · </span>
            <Link href="/ib/courses">IB courses</Link>
          </p>
        </div>
      </details>
    </section>
  )
}
