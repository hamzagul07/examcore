import Link from 'next/link'
import type { CSSProperties } from 'react'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { listNotes } from '@/lib/community/notes'
import { listQuestions } from '@/lib/community/qa'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { HubSeoIntro } from '@/components/seo/HubSeoIntro'
import { createPageMetadata } from '@/lib/seo/metadata'

export const dynamic = 'force-dynamic'

export const metadata = createPageMetadata({
  title: 'Community — student notes & Q&A',
  description:
    'Free student-contributed notes and a public Q&A for Cambridge and IB subjects. Read, upvote, ask, and answer — all moderated.',
  path: '/community',
})

export default async function CommunityHubPage() {
  if (!isCommunityEnabled()) {
    return (
      <MarketingPageShell narrow>
        <div className="ms-pg" style={{ paddingTop: 64, textAlign: 'center' }}>
          <p className="ms-overline">Community</p>
          <h1 className="ms-h2">Coming soon</h1>
          <p className="ms-body-2" style={{ color: 'var(--ec-text-secondary)' }}>
            Student notes and Q&amp;A are launching shortly.
          </p>
        </div>
      </MarketingPageShell>
    )
  }

  const [notes, questions] = await Promise.all([
    listNotes({ limit: 16 }),
    listQuestions({ limit: 16 }),
  ])

  return (
    <MarketingPageShell>
      <div className="ms-pg ms-subjects-page" style={{ paddingTop: 48, '--sc': 'var(--ec-brand)' } as CSSProperties}>
        <HubSeoIntro
          heading="The MarkScheme community"
          paragraph="Real notes and answers from students, for students — across every Cambridge and IB subject. Read for free, upvote what helps, and share your own. Everything is moderated and on-topic."
          links={[
            { href: '/subjects', label: 'Contribute on a subject →', variant: 'primary' },
            { href: '/ib/subjects', label: 'IB subjects', variant: 'ghost' },
            { href: '/community/guidelines', label: 'Community guidelines', variant: 'muted' },
          ]}
        />

        <div className="community-hub-grid">
          <section aria-labelledby="hub-notes">
            <div className="community-head">
              <h2 id="hub-notes" className="ms-h3">Latest notes</h2>
              <Link href="/subjects" className="ec-btn-underline text-sm">contribute →</Link>
            </div>
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
                        {n.authorUsername ? ` · @${n.authorUsername}` : ''}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ms-body-2" style={{ color: 'var(--ec-text-secondary)' }}>
                No notes yet — be the first on a <Link href="/subjects" className="ec-btn-underline">subject page</Link>.
              </p>
            )}
          </section>

          <section aria-labelledby="hub-qa">
            <div className="community-head">
              <h2 id="hub-qa" className="ms-h3">Latest questions</h2>
              <Link href="/subjects" className="ec-btn-underline text-sm">ask →</Link>
            </div>
            {questions.length ? (
              <ul className="community-note-list">
                {questions.map((q) => (
                  <li key={q.id} className="community-note-row">
                    <span className="community-vote" aria-hidden>
                      <span className="community-vote-caret">▲</span>
                      <span className="community-vote-n">{q.voteCount}</span>
                    </span>
                    <Link href={`/community/questions/${q.id}`} className="community-note-main">
                      <span className="community-note-title">
                        {q.title} {q.acceptedAnswerId ? <span className="community-solved">solved ✓</span> : null}
                      </span>
                      <span className="community-note-meta">
                        {q.board === 'ib' ? 'IB' : 'Cambridge'} · {q.subjectCode} · {q.answerCount} answers
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ms-body-2" style={{ color: 'var(--ec-text-secondary)' }}>
                No questions yet — ask one from any <Link href="/subjects" className="ec-btn-underline">subject page</Link>.
              </p>
            )}
          </section>
        </div>
      </div>
    </MarketingPageShell>
  )
}
