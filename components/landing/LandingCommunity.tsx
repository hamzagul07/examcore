import Link from 'next/link'

const TOPICS = [
  { board: 'A-Level', subject: '9702', title: 'Physics grade boundaries & paper talk' },
  { board: 'A-Level', subject: '9709', title: 'Pure vs Mechanics — share your take' },
  { board: 'IB HL', subject: 'math-aa-hl', title: 'IA topic ideas & marker tips' },
  { board: 'IB HL', subject: 'physics-hl', title: 'Past-paper doubts & resources' },
]

export function LandingCommunity() {
  return (
    <section id="community" className="ms-pg ms-sec scroll-mt-20">
      <div className="ms-courses-promo">
        <div>
          <p className="ms-overline" style={{ color: 'var(--ec-brand)' }}>
            Exam Room · free student community
          </p>
          <h2 className="ms-h2">
            Ask doubts. Share notes. <em>Discuss like Reddit.</em>
          </h2>
          <p className="ms-body-2" style={{ margin: '12px 0 24px' }}>
            Cambridge A-Level and IB Diploma communities — grade boundaries, past-paper questions,
            cheat sheets, and revision chat. Every subject has its own room. Post discussions,
            questions, or PDFs and images.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/community" className="ec-btn-primary ec-btn-primary--sm">
              Open Exam Room →
            </Link>
            <Link href="/community/submit" className="ec-btn-ghost ec-btn-ghost--sm">
              Start a discussion
            </Link>
          </div>
        </div>
        <div className="ms-course-mini">
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
