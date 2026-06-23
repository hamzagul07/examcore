import { redirect } from 'next/navigation'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { createPageMetadata } from '@/lib/seo/metadata'
import { createClient } from '@/lib/supabase-server'
import { getCommunitySubjects } from '@/lib/community/subjects'
import { getPostCountsBySubject } from '@/lib/community/counts'
import { popularSubjectIdsByBoard } from '@/lib/community/popular-subjects'
import { PostComposer } from '@/components/community/reddit/PostComposer'

export const metadata = createPageMetadata({
  title: 'Create a post — Exam Room',
  description: 'Share a discussion, ask a doubt, or post a resource to the student community.',
  path: '/community/submit',
})

export const dynamic = 'force-dynamic'

type PageProps = { searchParams: Promise<{ subject?: string; kind?: string; board?: string }> }

export default async function SubmitPage({ searchParams }: PageProps) {
  if (!isCommunityEnabled()) redirect('/community')
  const sp = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/signin?next=/community/submit`)

  const subjects = getCommunitySubjects().map((s) => ({
    id: s.id,
    name: s.name,
    board: s.board,
    accent: s.accent,
    glyph: s.glyph,
  }))
  const counts = await getPostCountsBySubject()
  const popularByBoard = popularSubjectIdsByBoard(subjects, counts)

  const subjectMeta = sp.subject ? subjects.find((s) => s.id === sp.subject) : null
  const initialBoard =
    sp.board === 'cambridge' || sp.board === 'ib'
      ? sp.board
      : subjectMeta?.board
  const initialKind =
    sp.kind === 'question' || sp.kind === 'resource' || sp.kind === 'discussion' ? sp.kind : undefined

  return (
    <div className="rc-page rc-page-narrow rc-page--composer">
      <PostComposer
        subjects={subjects}
        popularByBoard={popularByBoard}
        initialSubject={sp.subject}
        initialBoard={initialBoard}
        initialKind={initialKind}
        signedIn={!!user}
      />
    </div>
  )
}
