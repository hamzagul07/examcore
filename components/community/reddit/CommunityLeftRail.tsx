import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { Board } from '@/lib/community/posts'
import { getCommunitySubjects } from '@/lib/community/subjects'
import { getPostCountsBySubject } from '@/lib/community/counts'
import { compactCount } from '@/lib/community/format'

/** Desktop left rail — board shortcuts + top subject communities. */
export async function CommunityLeftRail({ board }: { board: Board | 'all' }) {
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
    <aside className="rc-left-rail">
      <section className="rc-side-card">
        <h3 className="rc-side-subtitle">Boards</h3>
        <nav className="rc-left-nav">
          <Link href="/community" className={`rc-left-nav-item${board === 'all' ? ' on' : ''}`}>
            All communities
          </Link>
          <Link
            href="/community?board=cambridge"
            className={`rc-left-nav-item${board === 'cambridge' ? ' on' : ''}`}
          >
            Cambridge A-Level
          </Link>
          <Link href="/community?board=ib" className={`rc-left-nav-item${board === 'ib' ? ' on' : ''}`}>
            IB Diploma
          </Link>
        </nav>
        <Link href="/community/subjects" className="rc-side-link" style={{ marginTop: 10 }}>
          Browse all subjects →
        </Link>
      </section>

      {showCambridge ? (
        <section className="rc-side-card">
          <h3 className="rc-side-subtitle">A-Level communities</h3>
          <ul className="rc-side-subjects">
            {cambridge.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/community/s/${s.id}`}
                  className="rc-side-subject"
                  style={{ '--sc': s.accent } as CSSProperties}
                >
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
          <h3 className="rc-side-subtitle">IB communities</h3>
          <ul className="rc-side-subjects">
            {ib.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/community/s/${s.id}`}
                  className="rc-side-subject"
                  style={{ '--sc': s.accent } as CSSProperties}
                >
                  <span className="rc-side-subject-glyph">{s.glyph}</span>
                  <span className="rc-side-subject-name">{s.name}</span>
                  <span className="rc-side-subject-count">{compactCount(s.posts)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </aside>
  )
}
