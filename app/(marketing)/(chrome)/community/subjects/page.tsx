import Link from 'next/link'
import type { CSSProperties } from 'react'
import { redirect } from 'next/navigation'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getCommunitySubjects } from '@/lib/community/subjects'
import { getPostCountsBySubject } from '@/lib/community/counts'
import { compactCount } from '@/lib/community/format'

export const metadata = createPageMetadata({
  title: 'Browse communities — Cambridge A-Level & IB',
  description:
    'Every Cambridge A-Level and IB Diploma subject community in one place. Ask doubts, share notes, and discuss grade boundaries with students revising the same syllabus.',
  path: '/community/subjects',
  keywords: ['Cambridge A Level communities', 'IB subject forums', 'student revision groups'],
})

export const dynamic = 'force-dynamic'

export default async function CommunitySubjectsPage() {
  if (!isCommunityEnabled()) redirect('/community')
  const counts = await getPostCountsBySubject()
  const cambridge = getCommunitySubjects().filter((s) => s.board === 'cambridge')
  const ib = getCommunitySubjects().filter((s) => s.board === 'ib')

  const Card = ({ s }: { s: ReturnType<typeof getCommunitySubjects>[number] }) => (
    <Link href={`/community/s/${s.id}`} className="rc-dir-card" style={{ '--sc': s.accent } as CSSProperties}>
      <span className="rc-dir-glyph">{s.glyph}</span>
      <span className="rc-dir-name">{s.name}</span>
      <span className="rc-dir-meta">s/{s.id} · {compactCount(counts[s.id] ?? 0)} posts</span>
    </Link>
  )

  return (
    <div className="rc-page">
      <div className="rc-dir-head">
        <Link href="/community" className="rc-back">← Exam Room</Link>
        <h1 className="rc-dir-h1">Browse communities</h1>
        <p className="rc-dir-sub">Jump into any subject to ask, share or discuss.</p>
      </div>

      <h2 className="rc-dir-section">Cambridge A-Level</h2>
      <div className="rc-dir-grid">{cambridge.map((s) => <Card key={s.id} s={s} />)}</div>

      <h2 className="rc-dir-section">IB Diploma</h2>
      <div className="rc-dir-grid">{ib.map((s) => <Card key={s.id} s={s} />)}</div>
    </div>
  )
}
