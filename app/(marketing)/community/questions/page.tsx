import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { CSSProperties } from 'react'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { createPageMetadata } from '@/lib/seo/metadata'
import { listQuestions, type Question } from '@/lib/community/qa'
import { findCommunitySubject } from '@/lib/community/subjects'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { JsonLd } from '@/components/seo/JsonLd'
import { SITE_URL } from '@/lib/site-config'

export const dynamic = 'force-dynamic'

export const metadata = createPageMetadata({
  title: 'Model answers & past-paper Q&A — MarkScheme community',
  description:
    'Browse full-marks model answers to real Cambridge A-Level past-paper questions, each with a mark-by-mark examiner breakdown. Free, searchable, and organised by subject.',
  path: '/community/questions',
  keywords: [
    'A Level model answers',
    'past paper worked solutions',
    'Cambridge exam answers',
    'mark scheme explained',
    '9709 model answers',
    '9702 physics answers',
    '9701 chemistry answers',
  ],
})

export default async function QuestionsIndexPage() {
  if (!isCommunityEnabled()) redirect('/community')

  const questions = await listQuestions({ limit: 500 })

  // Group by subject, ordered by how many answers each subject has.
  const groups = new Map<string, Question[]>()
  for (const q of questions) {
    const arr = groups.get(q.subjectCode) ?? []
    arr.push(q)
    groups.set(q.subjectCode, arr)
  }
  const ordered = [...groups.entries()]
    .map(([code, qs]) => ({ code, subject: findCommunitySubject(code), qs }))
    .sort((a, b) => b.qs.length - a.qs.length)

  // ItemList structured data helps search engines discover the thread pages.
  const itemList = {
    '@type': 'ItemList',
    itemListElement: questions.slice(0, 100).map((q, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/community/questions/${q.id}`,
      name: q.title,
    })),
  }

  return (
    <MarketingPageShell narrow>
      <JsonLd data={itemList} />
      <div className="ms-pg" style={{ paddingTop: 48 } as CSSProperties}>
        <Link href="/community" className="ec-btn-underline text-[15px]">
          ← Community
        </Link>
        <p className="ms-overline" style={{ marginTop: 16 }}>
          Model answers
        </p>
        <h1 className="ms-h2">Past-paper model answers &amp; Q&amp;A</h1>
        <p className="ms-body-2" style={{ color: 'var(--ec-text-secondary)', marginBottom: 28 }}>
          Full-marks worked answers to real Cambridge A-Level past-paper questions, each with a
          mark-by-mark examiner breakdown. {questions.length} answers and counting.
        </p>

        {ordered.length === 0 ? (
          <p className="community-empty">No model answers yet.</p>
        ) : (
          ordered.map(({ code, subject, qs }) => (
            <section key={code} style={{ marginBottom: 28 }}>
              <h2 className="ms-h3" style={{ marginBottom: 8 }}>
                {subject?.name ?? code}{' '}
                <span style={{ color: 'var(--ec-text-secondary)', fontWeight: 400 }}>· {qs.length}</span>
              </h2>
              <ul className="community-note-list">
                {qs.map((q) => (
                  <li key={q.id} className="community-note-row">
                    <Link href={`/community/questions/${q.id}`} className="community-note-main">
                      <span className="community-note-title">
                        {q.title}{' '}
                        {q.acceptedAnswerId ? <span className="community-solved">solved ✓</span> : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </MarketingPageShell>
  )
}
