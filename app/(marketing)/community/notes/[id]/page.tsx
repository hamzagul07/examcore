import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { getNote } from '@/lib/community/notes-read'
import { CommunityMarkdown } from '@/components/community/CommunityMarkdown'
import { NoteActions } from '@/components/community/NoteActions'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { createPageMetadata } from '@/lib/seo/metadata'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const note = await getNote(id)
  if (!note || note.status !== 'published') return {}
  return createPageMetadata({
    title: `${note.title} — community notes`,
    description: note.contentMd.replace(/[#*`_>$]/g, '').slice(0, 155),
    path: `/community/notes/${id}`,
  })
}

export default async function CommunityNotePage({ params }: Props) {
  const { id } = await params
  const note = await getNote(id)
  if (!note || note.status !== 'published') notFound()

  const subjectHref =
    note.board === 'ib' ? `/ib/subjects/${note.subjectCode}` : `/subjects/${note.subjectCode}`

  return (
    <MarketingPageShell narrow>
      <article className="ms-pg" style={{ paddingTop: 48, '--sc': 'var(--ec-brand)' } as CSSProperties}>
        <Link href={subjectHref} className="ec-btn-underline text-[15px]">
          ← Back to {note.subjectCode}
        </Link>
        <p className="ms-overline" style={{ marginTop: 16 }}>
          Community note
        </p>
        <h1 className="ms-h2" style={{ marginBottom: 6 }}>
          {note.title}
        </h1>
        <p className="ms-body-2" style={{ color: 'var(--ec-text-faint)', marginBottom: 20 }}>
          by{' '}
          {note.authorUsername ? (
            <Link href={`/u/${note.authorUsername}`} className="ec-btn-underline">
              @{note.authorUsername}
            </Link>
          ) : (
            'a student'
          )}{' '}
          · contributed by a fellow student, not an official MarkScheme lesson
        </p>
        <div className="community-note-body">
          <CommunityMarkdown content={note.contentMd} />
        </div>
        <NoteActions id={note.id} initialUpvotes={note.upvoteCount} initialSaves={note.saveCount} />
      </article>
    </MarketingPageShell>
  )
}
