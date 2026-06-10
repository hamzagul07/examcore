import Link from 'next/link'
import { SubjectCard } from '@/components/margin-notes'
import { LANDING_SUBJECT_PREVIEW } from '@/lib/landing-subjects-preview'

export function LandingSubjects() {
  return (
    <section id="subjects" className="ms-pg ms-sec scroll-mt-20">
      <div className="ms-subjects-head">
        <div>
          <p className="ms-overline">Subjects</p>
          <h2 className="ms-h2">
            Fifteen papers. <em>One place.</em>
          </h2>
        </div>
        <Link href="/subjects" className="ec-btn-ghost ec-btn-ghost--sm">
          All subjects &amp; levels →
        </Link>
      </div>
      <div className="ms-scard-grid">
        {LANDING_SUBJECT_PREVIEW.map((subject) => (
          <SubjectCard key={subject.code} subject={subject} />
        ))}
      </div>
      <p className="ms-micro" style={{ marginTop: 22 }}>
        + O-LEVEL SYLLABUSES · IB &amp; OTHER BOARDS COMING LATER
      </p>
    </section>
  )
}
