import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { createPageMetadata } from '@/lib/seo/metadata'
import { createClient } from '@/lib/supabase-server'
import { listPosts, getUserPostVotes, type PostSort } from '@/lib/community/posts'
import { findCommunitySubject } from '@/lib/community/subjects'
import { CreatePostBar } from '@/components/community/reddit/CreatePostBar'
import { SortTabs } from '@/components/community/reddit/SortTabs'
import { PostFeed } from '@/components/community/reddit/PostFeed'
import { SubjectSidebar } from '@/components/community/reddit/Sidebar'

export const dynamic = 'force-dynamic'

const SORTS: PostSort[] = ['hot', 'new', 'top', 'rising']

type PageProps = {
  params: Promise<{ subject: string }>
  searchParams: Promise<{ sort?: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { subject } = await params
  const s = findCommunitySubject(subject)
  return createPageMetadata({
    title: s ? `s/${subject} — ${s.name} community` : 'Subject community',
    description: s
      ? `Doubts, cheat sheets and discussion for ${s.name} students.`
      : 'Subject community.',
    path: `/community/s/${subject}`,
  })
}

export default async function SubjectCommunityPage({ params, searchParams }: PageProps) {
  if (!isCommunityEnabled()) notFound()
  const { subject } = await params
  const sp = await searchParams
  const subjectMeta = findCommunitySubject(subject)
  if (!subjectMeta) notFound()

  const sort: PostSort = SORTS.includes(sp.sort as PostSort) ? (sp.sort as PostSort) : 'hot'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const posts = await listPosts({ subjectCode: subject, sort, limit: 30 })
  const userVotes = user ? await getUserPostVotes(user.id, posts.map((p) => p.id)) : {}

  return (
    <div className="rc-page" style={{ '--sc': subjectMeta.accent } as CSSProperties}>
      <div className="rc-subject-banner" style={{ '--sc': subjectMeta.accent } as CSSProperties}>
        <div className="rc-subject-banner-inner">
          <span className="rc-subject-banner-glyph">{subjectMeta.glyph}</span>
          <div>
            <h1 className="rc-subject-banner-title">s/{subject}</h1>
            <p className="rc-subject-banner-sub">{subjectMeta.name}</p>
          </div>
        </div>
      </div>
      <div className="rc-layout">
        <main className="rc-main">
          <CreatePostBar subjectCode={subject} signedIn={!!user} />
          <SortTabs active={sort} basePath={`/community/s/${subject}`} />
          <PostFeed
            posts={posts}
            userVotes={userVotes}
            signedIn={!!user}
            emptyLabel={`No posts in s/${subject} yet. Be the first to post.`}
          />
        </main>
        <SubjectSidebar subjectCode={subject} subjectName={subjectMeta.name} accent={subjectMeta.accent} />
      </div>
    </div>
  )
}
