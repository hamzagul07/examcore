import Link from 'next/link'
import type { CSSProperties } from 'react'
import { getCommunitySubjects } from '@/lib/community/subjects'
import { getSubjectLeaderboard } from '@/lib/community/leaderboard'
import { getSubjectPostCount, getPostCountsBySubject } from '@/lib/community/counts'
import { compactCount } from '@/lib/community/format'

/** Right rail for the community home. */
export async function CommunitySidebar() {
  const counts = await getPostCountsBySubject()
  const subjects = getCommunitySubjects()
    .map((s) => ({ ...s, posts: counts[s.id] ?? 0 }))
    .sort((a, b) => b.posts - a.posts || a.name.localeCompare(b.name))
    .slice(0, 12)

  return (
    <aside className="rc-sidebar">
      <section className="rc-side-card rc-side-about">
        <h2 className="rc-side-title">Exam Room</h2>
        <p className="rc-side-text">
          The student community for Cambridge A-Level &amp; IB. Ask doubts, share cheat sheets and
          resources, and discuss everything from grade boundaries to tricky past-paper questions.
        </p>
        <Link href="/community/submit" className="rc-btn rc-btn-primary rc-side-cta">Create a post</Link>
        <Link href="/community/guidelines" className="rc-side-link">Community guidelines →</Link>
      </section>

      <section className="rc-side-card">
        <h3 className="rc-side-subtitle">Popular subjects</h3>
        <ul className="rc-side-subjects">
          {subjects.map((s) => (
            <li key={s.id}>
              <Link href={`/community/s/${s.id}`} className="rc-side-subject" style={{ '--sc': s.accent } as CSSProperties}>
                <span className="rc-side-subject-glyph">{s.glyph}</span>
                <span className="rc-side-subject-name">{s.name}</span>
                <span className="rc-side-subject-count">{compactCount(s.posts)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/community/subjects" className="rc-side-link">Browse all subjects →</Link>
      </section>
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

  return (
    <aside className="rc-sidebar">
      <section className="rc-side-card" style={{ '--sc': accent } as CSSProperties}>
        <h2 className="rc-side-title">s/{subjectCode}</h2>
        <p className="rc-side-text">{subjectName} — doubts, cheat sheets and discussion.</p>
        <div className="rc-side-stats">
          <div><strong>{compactCount(postCount)}</strong><span>posts</span></div>
        </div>
        <Link href={`/community/submit?subject=${subjectCode}`} className="rc-btn rc-btn-primary rc-side-cta">
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
