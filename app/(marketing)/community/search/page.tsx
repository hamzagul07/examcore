import Link from 'next/link'
import type { CSSProperties } from 'react'
import { notFound } from 'next/navigation'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { createPageMetadata } from '@/lib/seo/metadata'
import { searchCommunity } from '@/lib/community/search'
import { findCommunitySubject } from '@/lib/community/subjects'
import { compactCount } from '@/lib/community/format'
import { CommunitySearchBar } from '@/components/community/reddit/CommunitySearchBar'

export const metadata = createPageMetadata({
  title: 'Search — Exam Room',
  description: 'Search student doubts, discussions and resources.',
  path: '/community/search',
})

export const dynamic = 'force-dynamic'

const KIND_LABEL: Record<string, string> = { discussion: 'Discussion', question: 'Question', resource: 'Resource' }

type PageProps = { searchParams: Promise<{ q?: string; subject?: string }> }

export default async function CommunitySearchPage({ searchParams }: PageProps) {
  if (!isCommunityEnabled()) notFound()
  const sp = await searchParams
  const q = (sp.q ?? '').trim()
  const hits = q.length >= 2 ? await searchCommunity({ query: q, subjectCode: sp.subject, limit: 40 }) : []

  return (
    <div className="rc-page rc-page-narrow">
      <Link href="/community" className="rc-back">← Exam Room</Link>
      <h1 className="rc-dir-h1" style={{ marginBottom: 14 }}>Search</h1>
      <CommunitySearchBar subjectCode={sp.subject} defaultValue={q} />

      <div style={{ marginTop: 18 }}>
        {q.length < 2 ? (
          <p className="rc-dir-sub">Type at least 2 characters to search.</p>
        ) : hits.length === 0 ? (
          <div className="rc-empty"><div className="rc-empty-glyph" aria-hidden>🔍</div><p>No results for “{q}”.</p></div>
        ) : (
          <div className="rc-feed">
            {hits.map((h) => {
              const subject = findCommunitySubject(h.subjectCode)
              const accent = subject?.accent ?? 'var(--ec-brand)'
              return (
                <Link key={h.id} href={h.href} className="rc-card" style={{ '--sc': accent, gridTemplateColumns: '1fr' } as CSSProperties}>
                  <div className="rc-card-body">
                    <div className="rc-card-meta">
                      <span className="rc-subject-pill" style={{ '--sc': accent } as CSSProperties}>
                        <span className="rc-subject-glyph">{subject?.glyph ?? '#'}</span>
                        <span>s/{h.subjectCode}</span>
                      </span>
                      <span className="rc-dot">·</span>
                      <span className="rc-meta-muted">{compactCount(h.score)} points · {h.commentCount} comments</span>
                    </div>
                    <h3 className="rc-card-title">
                      <span className="rc-card-title-chips">
                        <span className={`rc-kind rc-kind-${h.kind}`}>{KIND_LABEL[h.kind]}</span>
                      </span>
                      <span className="rc-card-title-text">{h.title}</span>
                    </h3>
                    {h.snippet ? <p className="rc-card-snippet">{h.snippet}</p> : null}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
