import Link from 'next/link'
import { landingCourseMiniCards } from '@/lib/landing-subjects-preview'

export function LandingCoursesPromo() {
  const courses = landingCourseMiniCards()

  return (
    <section id="courses" className="ms-pg ms-sec scroll-mt-20">
      <div className="ms-courses-promo">
        <div>
          <p className="ms-overline" style={{ color: 'var(--ec-brand)' }}>
            100% free · forever
          </p>
          <h2 className="ms-h2">
            Premium courses, <em>without the premium</em>.
          </h2>
          <p className="ms-body-2" style={{ margin: '12px 0 24px' }}>
            Syllabus-aligned lessons with worked examples, exam tips, flashcards — and a real
            past-paper question for every syllabus point. Learn it, practise it, then one-click
            into marking.
          </p>
          <Link href="/courses" className="ec-btn-ghost ec-btn-ghost--sm">
            Browse the courses →
          </Link>
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
