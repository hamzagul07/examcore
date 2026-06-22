import Link from 'next/link'
import { isCommunityEnabled } from '@/lib/community/enabled'

const TOPICS = [
  { board: 'Cambridge A-Level', subject: '9702', title: 'Physics grade boundaries & paper talk' },
  { board: 'Cambridge A-Level', subject: '9709', title: 'Pure vs Mechanics — share your take' },
  { board: 'IB Diploma', subject: 'math-aa-hl', title: 'IA topic ideas & marker tips' },
  { board: 'IB Diploma', subject: 'physics-hl', title: 'Past-paper doubts & resources' },
]

const POST_TYPES = [
  { icon: '💬', label: 'Discussion', desc: 'Grade boundaries, paper talk, revision strategies' },
  { icon: '❓', label: 'Question', desc: 'Stuck on a past-paper step? Ask the room' },
  { icon: '📎', label: 'Resource', desc: 'Cheat sheets, notes, PDFs — share with attachments' },
]

const FEED_SORTS = ['Hot', 'New', 'Top', 'Rising']

export function LandingCommunity() {
  const live = isCommunityEnabled()

  return (
    <section id="community" className="ms-pg ms-sec scroll-mt-20">
      <div className="ms-courses-promo">
        <div>
          <p className="ms-overline" style={{ color: 'var(--ec-brand)' }}>
            Discuss · Exam Room · free
          </p>
          <h2 className="ms-h2">
            Ask doubts. Share notes. <em>Discuss like Reddit.</em>
          </h2>
          <p className="ms-body-2 ms-detail-intro" style={{ margin: '12px 0 20px' }}>
            Cambridge A-Level and IB Diploma are <strong>different boards</strong> here — you pick
            your board when posting, then choose a subject room. No mixed threads; each syllabus gets
            its own community (s/9702, s/math-aa-hl, and so on).
          </p>

          <div className="ms-community-flow">
            <div className="ms-community-flow-step">
              <span className="ms-community-flow-num">1</span>
              <div>
                <strong>Choose board</strong>
                <p>Cambridge A-Level or IB Diploma</p>
              </div>
            </div>
            <div className="ms-community-flow-step">
              <span className="ms-community-flow-num">2</span>
              <div>
                <strong>Pick subject room</strong>
                <p>15+ Cambridge codes &amp; IB HL/SL subjects</p>
              </div>
            </div>
            <div className="ms-community-flow-step">
              <span className="ms-community-flow-num">3</span>
              <div>
                <strong>Post &amp; reply</strong>
                <p>Upvote, thread comments, attach files</p>
              </div>
            </div>
          </div>

          <p className="ms-detail-kicker" style={{ marginTop: 24, marginBottom: 10 }}>
            Post types
          </p>
          <ul className="ms-detail-list ms-detail-list--compact">
            {POST_TYPES.map((t) => (
              <li key={t.label}>
                <span className="ms-detail-list-icon" aria-hidden>{t.icon}</span>
                <span>
                  <strong>{t.label}</strong> — {t.desc}
                </span>
              </li>
            ))}
          </ul>

          <p className="ms-detail-foot" style={{ marginTop: 16 }}>
            Sort feeds by {FEED_SORTS.join(', ')}. Moderated for spam; report anything off-topic.
          </p>

          <div className="ms-cta-row" style={{ marginTop: 20 }}>
            <Link href="/community" className="ec-btn-primary ec-btn-primary--sm">
              {live ? 'Open Exam Room →' : 'Preview Exam Room →'}
            </Link>
            {live ? (
              <Link href="/community/submit" className="ec-btn-ghost ec-btn-ghost--sm">
                Create a post
              </Link>
            ) : null}
            <Link href="/community/subjects" className="ec-btn-ghost ec-btn-ghost--sm">
              All subject rooms
            </Link>
          </div>
        </div>
        <div className="ms-course-mini">
          <p className="ms-detail-kicker" style={{ marginBottom: 12, gridColumn: '1 / -1' }}>
            Trending rooms
          </p>
          {TOPICS.map((t) => (
            <Link
              key={t.subject}
              href={`/community/s/${t.subject}`}
              className="ms-course-card"
            >
              <span className="ms-code">{t.board}</span>
              <div className="ms-name">s/{t.subject}</div>
              <div className="ms-meta">{t.title}</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
