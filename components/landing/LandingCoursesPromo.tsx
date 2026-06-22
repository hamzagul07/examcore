import Link from 'next/link'
import { landingCourseMiniCards } from '@/lib/landing-subjects-preview'

const COURSE_INCLUDES = [
  { icon: '📝', label: 'Syllabus notes', desc: 'Point-by-point theory aligned to your board' },
  { icon: '∑', label: 'Formulas & examples', desc: 'Worked solutions with examiner-style layout' },
  { icon: '◇', label: 'Live diagrams', desc: 'Interactive visuals on Pro trial and paid plans' },
  { icon: '🃏', label: 'Flashcards & quizzes', desc: 'Quick-check before you attempt papers' },
  { icon: '→', label: 'Mark this question', desc: 'Jump from any topic into real past-paper marking' },
]

export function LandingCoursesPromo() {
  const courses = landingCourseMiniCards()

  return (
    <section id="courses" className="ms-pg ms-sec scroll-mt-20">
      <div className="ms-courses-promo">
        <div>
          <p className="ms-overline" style={{ color: 'var(--ec-brand)' }}>
            Learn · 100% free notes &amp; examples
          </p>
          <h2 className="ms-h2">
            Premium courses, <em>without the premium</em>.
          </h2>
          <p className="ms-body-2 ms-detail-intro" style={{ margin: '12px 0 20px' }}>
            Fifteen Cambridge A-Levels, O-Level subjects, and IB Diploma courses — each lesson
            mapped to the official syllabus. Read the content, practise with flashcards, then mark
            a real exam question for that exact topic without hunting for the right paper.
          </p>
          <ul className="ms-detail-list ms-detail-list--compact">
            {COURSE_INCLUDES.map((item) => (
              <li key={item.label}>
                <span className="ms-detail-list-icon" aria-hidden>{item.icon}</span>
                <span>
                  <strong>{item.label}</strong> — {item.desc}
                </span>
              </li>
            ))}
          </ul>
          <div className="ms-detail-boards" style={{ marginTop: 20 }}>
            <span className="ms-detail-board-tag ms-detail-board-tag--caie">Cambridge A-Level</span>
            <span className="ms-detail-board-tag ms-detail-board-tag--caie">O-Level</span>
            <span className="ms-detail-board-tag ms-detail-board-tag--ib">IB HL &amp; SL</span>
          </div>
          <div className="ms-cta-row" style={{ marginTop: 24 }}>
            <Link href="/courses" className="ec-btn-primary ec-btn-primary--sm">
              Browse all courses →
            </Link>
            <Link href="/ib" className="ec-btn-ghost ec-btn-ghost--sm">
              IB Diploma hub
            </Link>
          </div>
        </div>
        <div className="ms-course-mini">
          {courses.map((course) => (
            <Link key={course.code} href={course.href} className="ms-course-card">
              <span className="ms-code">{course.code}</span>
              <div className="ms-name">{course.name}</div>
              <div className="ms-meta">{course.meta}</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
