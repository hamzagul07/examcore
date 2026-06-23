import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { Board } from '@/lib/community/posts'
import { getCommunitySubjects, findCommunitySubject } from '@/lib/community/subjects'
import { getSubjectLeaderboard } from '@/lib/community/leaderboard'
import { getSubjectPostCount, getPostCountsBySubject } from '@/lib/community/counts'
import { compactCount } from '@/lib/community/format'

/** Right rail for the community home. */
export async function CommunitySidebar({ board = 'all' }: { board?: Board | 'all' }) {
  const counts = await getPostCountsBySubject()
  const cambridge = getCommunitySubjects()
    .filter((s) => s.board === 'cambridge')
    .map((s) => ({ ...s, posts: counts[s.id] ?? 0 }))
    .sort((a, b) => b.posts - a.posts || a.name.localeCompare(b.name))
    .slice(0, 6)
  const ib = getCommunitySubjects()
    .filter((s) => s.board === 'ib')
    .map((s) => ({ ...s, posts: counts[s.id] ?? 0 }))
    .sort((a, b) => b.posts - a.posts || a.name.localeCompare(b.name))
    .slice(0, 6)

  const showCambridge = board === 'all' || board === 'cambridge'
  const showIb = board === 'all' || board === 'ib'

  return (
    <aside className="rc-sidebar">
      <section className="rc-side-card rc-side-about">
        <h2 className="rc-side-title">Exam Room</h2>
        <p className="rc-side-text">
          Free communities for <strong>Cambridge A-Level</strong> and <strong>IB Diploma</strong>.
          Ask doubts, share cheat sheets, discuss grade boundaries, and help each other revise.
        </p>
        <Link
          href={board === 'all' ? '/community/submit' : `/community/submit?board=${board}`}
          className="rc-btn rc-btn-primary rc-side-cta"
        >
          Create a post
        </Link>
        <Link href="/community/guidelines" className="rc-side-link">Community guidelines →</Link>
      </section>

      {showCambridge ? (
        <section className="rc-side-card">
          <h3 className="rc-side-subtitle">Cambridge A-Level</h3>
          <ul className="rc-side-subjects">
            {cambridge.map((s) => (
              <li key={s.id}>
                <Link href={`/community/s/${s.id}`} className="rc-side-subject" style={{ '--sc': s.accent } as CSSProperties}>
                  <span className="rc-side-subject-glyph">{s.glyph}</span>
                  <span className="rc-side-subject-name">{s.name}</span>
                  <span className="rc-side-subject-count">{compactCount(s.posts)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {showIb ? (
        <section className="rc-side-card">
          <h3 className="rc-side-subtitle">IB Diploma</h3>
          <ul className="rc-side-subjects">
            {ib.map((s) => (
              <li key={s.id}>
                <Link href={`/community/s/${s.id}`} className="rc-side-subject" style={{ '--sc': s.accent } as CSSProperties}>
                  <span className="rc-side-subject-glyph">{s.glyph}</span>
                  <span className="rc-side-subject-name">{s.name}</span>
                  <span className="rc-side-subject-count">{compactCount(s.posts)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Link href="/community/subjects" className="rc-side-link rc-side-link-block">Browse all subjects →</Link>
    </aside>
  )
}

/** Right rail for a specific subject "subreddit". */
export async function SubjectSidebar({
  subjectCode,
  subjectName,
  accent,
}: {
  subjectCode: string
  subjectName: string
  accent: string
}) {
  const [postCount, leaders] = await Promise.all([
    getSubjectPostCount(subjectCode),
    getSubjectLeaderboard(subjectCode, 8),
  ])

  const subjectMeta = findCommunitySubject(subjectCode)
  const submitQs = new URLSearchParams({
    board: subjectMeta?.board ?? 'cambridge',
    subject: subjectCode,
  })

  return (
    <aside className="rc-sidebar">
      <section className="rc-side-card" style={{ '--sc': accent } as CSSProperties}>
        <h2 className="rc-side-title">s/{subjectCode}</h2>
        <p className="rc-side-text">{subjectName} — doubts, cheat sheets and discussion.</p>
        <div className="rc-side-stats">
          <div><strong>{compactCount(postCount)}</strong><span>posts</span></div>
        </div>
        <Link href={`/community/submit?${submitQs}`} className="rc-btn rc-btn-primary rc-side-cta">
          Create post
        </Link>
      </section>

      <section className="rc-side-card">
        <h3 className="rc-side-subtitle">Rules</h3>
        <ol className="rc-side-rules">
          <li>Be respectful — help, don&apos;t harass.</li>
          <li>Stay on-topic for {subjectCode}.</li>
          <li>No spam, ads, or contact-sharing.</li>
          <li>Credit sources you share.</li>
        </ol>
      </section>

      {leaders.length ? (
        <section className="rc-side-card">
          <h3 className="rc-side-subtitle">Top contributors</h3>
          <ul className="rc-side-leaders">
            {leaders.map((l) => (
              <li key={l.userId}>
                <span className="rc-side-rank">{l.rank}</span>
                {l.username ? (
                  <Link href={`/u/${l.username}`} className="rc-side-leader-name">u/{l.username}</Link>
                ) : (
                  <span className="rc-side-leader-name">anonymous</span>
                )}
                <span className="rc-side-leader-rep">{compactCount(l.reputation)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </aside>
  )
}
