import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProfileByUsername } from '@/lib/community/profile'
import { listNotes } from '@/lib/community/notes-read'
import { listQuestions } from '@/lib/community/qa-read'
import { getSubjectReputations } from '@/lib/community/leaderboard'
import { badgesForReputation } from '@/lib/community/xp'
import { ProfileContributions } from '@/components/community/ProfileContributions'
import { createPageMetadata } from '@/lib/seo/metadata'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props) {
  const { username } = await params
  const profile = await getProfileByUsername(username)
  if (!profile) return {}
  return createPageMetadata({
    title: `@${profile.username} — Exam Room contributor`,
    description: `Doubts, answers, and cheat sheets by @${profile.username} on MarkScheme. Reputation ${profile.reputation}.`,
    path: `/u/${profile.username}`,
  })
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  const profile = await getProfileByUsername(username)
  if (!profile) notFound()

  const [notes, questions, subjectReps] = await Promise.all([
    listNotes({ authorId: profile.id, limit: 100 }),
    listQuestions({ authorId: profile.id, limit: 100 }),
    getSubjectReputations(profile.id),
  ])

  const admin = createServiceClient()
  const { count: answersCount } = await admin
    .from('community_answers')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', profile.id)
    .eq('status', 'published')

  const badges = badgesForReputation(profile.reputation, subjectReps)

  return (
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
            <strong>{profile.reputation}</strong> reputation · {notes.length} cheat sheets ·{' '}
            {questions.length} doubts
          </p>
          {profile.bio ? (
            <p className="ms-body-2" style={{ marginTop: 6 }}>
              {profile.bio}
            </p>
          ) : null}
          {badges.length ? (
            <div className="exam-room-badges">
              {badges.map((b) => (
                <span key={b} className="exam-room-badge">
                  {b}
                </span>
              ))}
            </div>
          ) : null}
          {subjectReps.length ? (
            <div className="exam-room-subject-rep">
              {subjectReps.map((sr) => (
                <span key={sr.subjectCode} className="exam-room-subject-rep-chip">
                  {sr.subjectCode}: {sr.reputation} rep
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <ProfileContributions
        notes={notes}
        questions={questions}
        answersCount={answersCount ?? 0}
      />

      <p className="ms-body-2" style={{ marginTop: 24 }}>
        <Link href="/community" className="ec-btn-underline">
          Back to Exam Room →
        </Link>
      </p>
    </div>
  )
}
