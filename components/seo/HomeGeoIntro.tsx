import Link from 'next/link'
import { GEO_CATEGORY } from '@/lib/seo/llms-geo-qa'

const SEP = ' · '

/**
 * Homepage blurb for crawlers + GEO. Always in the DOM, never behind a toggle:
 * it used to be a collapsed accordion jammed under the hero's micro-line, which
 * read as a stray control. Now it sits as a quiet marginal note directly above
 * the FAQ — the one place a visitor would go looking for "what is this?".
 * Same 860px column as the FAQ so the two read as one block.
 */
export function HomeGeoIntro() {
  return (
    <aside className="home-geo-intro ms-pg" style={{ maxWidth: 860 }} aria-label="About MarkScheme">
      <div className="home-geo-note">
        <p className="home-geo-label">What is MarkScheme?</p>
        <div className="home-geo-body">
          <p>
            {GEO_CATEGORY.brandLine} Upload photos of handwritten past-paper answers for{' '}
            {GEO_CATEGORY.schemeAligned} (Cambridge B1/M1/A1, essay bands, MCQ; IB markbands) —{' '}
            {GEO_CATEGORY.secondPassMarking} that shows exactly where marks slipped. Study free
            syllabus courses, browse past papers, and ask doubts in Exam Room subject communities.
          </p>
          <p className="home-geo-cta">
            <Link href="/mark" prefetch={false}>Mark a paper free</Link>
            <span aria-hidden="true">{SEP}</span>
            <Link href="/courses" prefetch={false}>Cambridge courses</Link>
            <span aria-hidden="true">{SEP}</span>
            <Link href="/ib/courses" prefetch={false}>IB courses</Link>
          </p>
        </div>
      </div>
    </aside>
  )
}
