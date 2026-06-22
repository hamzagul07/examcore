import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProfileByUsername } from '@/lib/community/profile'
import { listNotes } from '@/lib/community/notes'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { createPageMetadata } from '@/lib/seo/metadata'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props) {
  const { username } = await params
  const profile = await getProfileByUsername(username)
  if (!profile) return {}
  return createPageMetadata({
    title: `@${profile.username} — community contributor`,
    description: `Notes and contributions by @${profile.username} on MarkScheme. Reputation ${profile.reputation}.`,
    path: `/u/${profile.username}`,
  })
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  const profile = await getProfileByUsername(username)
  if (!profile) notFound()
  const notes = await listNotes({ authorId: profile.id, limit: 100 })

  return (
    <MarketingPageShell narrow>
      <div className="ms-pg" style={{ paddingTop: 48 }}>
        <div className="ms-sd-head">
          <div className="ms-sd-glyph" aria-hidden>
            {profile.username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="ms-h2" style={{ marginBottom: 2 }}>
              @{profile.username}
            </h1>
            <p className="ms-body-2" style={{ color: 'var(--ec-text-secondary)' }}>
              <strong>{profile.reputation}</strong> reputation · {notes.length}{' '}
              {notes.length === 1 ? 'note' : 'notes'} shared
              {profile.reputation >= 50 ? ' · 🏆 Top contributor' : ''}
            </p>
            {profile.bio ? (
              <p className="ms-body-2" style={{ marginTop: 6 }}>
                {profile.bio}
              </p>
            ) : null}
          </div>
        </div>

        <h2 className="ms-h3" style={{ marginTop: 32, marginBottom: 14 }}>
          Contributed notes
        </h2>
        {notes.length ? (
          <ul className="community-note-list">
            {notes.map((n) => (
              <li key={n.id} className="community-note-row">
                <span className="community-vote" aria-hidden>
                  <span className="community-vote-caret">▲</span>
                  <span className="community-vote-n">{n.upvoteCount}</span>
                </span>
                <Link href={`/community/notes/${n.id}`} className="community-note-main">
                  <span className="community-note-title">{n.title}</span>
                  <span className="community-note-meta">
                    {n.board === 'ib' ? 'IB' : 'Cambridge'} · {n.subjectCode}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ms-body-2" style={{ color: 'var(--ec-text-secondary)' }}>
            No published notes yet.
          </p>
        )}
      </div>
    </MarketingPageShell>
  )
}
