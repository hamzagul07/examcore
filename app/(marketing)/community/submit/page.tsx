import { redirect } from 'next/navigation'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { createPageMetadata } from '@/lib/seo/metadata'
import { createClient } from '@/lib/supabase-server'
import { getCommunitySubjects } from '@/lib/community/subjects'
import { PostComposer } from '@/components/community/reddit/PostComposer'

export const metadata = createPageMetadata({
  title: 'Create a post — Exam Room',
  description: 'Share a discussion, ask a doubt, or post a resource to the student community.',
  path: '/community/submit',
})

export const dynamic = 'force-dynamic'

type PageProps = { searchParams: Promise<{ subject?: string; kind?: string }> }

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

  return (
    <div className="rc-page rc-page-narrow">
      <PostComposer subjects={subjects} initialSubject={sp.subject} signedIn={!!user} />
    </div>
  )
}
