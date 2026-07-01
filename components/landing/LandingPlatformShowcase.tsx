import Link from 'next/link'
import { landingCourseMiniCards } from '@/lib/landing-subjects-preview'
import { isCommunityEnabled } from '@/lib/community/enabled'

const TRENDING_ROOMS = [
  { board: 'Cambridge A-Level', subject: '9702', title: 'Physics grade boundaries & paper talk' },
  { board: 'Cambridge A-Level', subject: '9709', title: 'Pure vs Mechanics — share your take' },
  { board: 'IB Diploma', subject: 'math-aa-hl', title: 'IA topic ideas & marker tips' },
  { board: 'IB Diploma', subject: 'physics-hl', title: 'Past-paper doubts & resources' },
]

export function LandingPlatformShowcase() {
  const courses = landingCourseMiniCards()
  const communityLive = isCommunityEnabled()

  return (
    <section className="ms-pg ms-sec ms-platform-showcase scroll-mt-20">
      <div className="ms-showcase-head">
        <div>
          <p className="ms-overline">See it live</p>
          <h2 className="ms-h2">
            Jump into a <em>course</em> or a <em>room</em>
          </h2>
          <p className="ms-lead">
            No hunting through folders — pick a subject and start revising or posting.
          </p>
        </div>
        <div className="ms-showcase-head-ctas">
          <Link href="/courses" className="ec-btn-primary ec-btn-primary--sm">
            All courses
          </Link>
          <Link href="/community" className="ec-btn-ghost ec-btn-ghost--sm">
            {communityLive ? 'Exam Room' : 'Preview Exam Room'}
          </Link>
        </div>
      </div>

      <div className="ms-showcase-split">
        <div id="courses" className="ms-showcase-panel ms-showcase-panel--learn">
          <div className="ms-showcase-panel-head">
            <span className="ms-showcase-panel-icon" aria-hidden>
              📚
            </span>
            <div>
              <p className="ms-showcase-panel-kicker">Learn</p>
              <h3 className="ms-h3">Popular courses</h3>
            </div>
            <Link href="/ib" className="ec-btn-underline ms-showcase-panel-link">
              IB hub →
            </Link>
          </div>
          <div className="ms-course-mini ms-course-mini--showcase">
            {courses.map((course) => (
              <Link key={course.code} href={course.href} className="ms-course-card">
                <span className="ms-code">{course.code}</span>
                <div className="ms-name">{course.name}</div>
                <div className="ms-meta">{course.meta}</div>
              </Link>
            ))}
          </div>
        </div>

        <div id="community" className="ms-showcase-panel ms-showcase-panel--discuss">
          <div className="ms-showcase-panel-head">
            <span className="ms-showcase-panel-icon" aria-hidden>
              💬
            </span>
            <div>
              <p className="ms-showcase-panel-kicker">Discuss</p>
              <h3 className="ms-h3">Trending rooms</h3>
            </div>
            <Link href={communityLive ? '/community/subjects' : '/community'} className="ec-btn-underline ms-showcase-panel-link">
              All rooms →
            </Link>
          </div>
          <div className="ms-course-mini ms-course-mini--showcase">
            {TRENDING_ROOMS.map((room) => (
              <Link
                key={room.subject}
                href={communityLive ? `/community/s/${room.subject}` : '/community'}
                className="ms-course-card"
              >
                <span className="ms-code">{room.board}</span>
                <div className="ms-name">s/{room.subject}</div>
                <div className="ms-meta">{room.title}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
