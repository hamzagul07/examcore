import Link from 'next/link'
import type { CSSProperties } from 'react'
import { notFound } from 'next/navigation'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getCommunitySubjects } from '@/lib/community/subjects'
import { getPostCountsBySubject } from '@/lib/community/counts'
import { compactCount } from '@/lib/community/format'

export const metadata = createPageMetadata({
  title: 'Browse communities — Exam Room',
  description: 'Every Cambridge A-Level and IB subject community in one place.',
  path: '/community/subjects',
})

export const dynamic = 'force-dynamic'

export default async function CommunitySubjectsPage() {
  if (!isCommunityEnabled()) notFound()
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
    <div className="rc-page rc-page-narrow">
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
