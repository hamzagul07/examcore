import { redirect } from 'next/navigation'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { createPageMetadata } from '@/lib/seo/metadata'
import { createClient } from '@/lib/supabase-server'
import { listPosts, getUserPostVotes, type PostSort } from '@/lib/community/posts'
import { CreatePostBar } from '@/components/community/reddit/CreatePostBar'
import { CommunitySearchBar } from '@/components/community/reddit/CommunitySearchBar'
import { SortTabs } from '@/components/community/reddit/SortTabs'
import { PostFeed } from '@/components/community/reddit/PostFeed'
import { CommunitySidebar } from '@/components/community/reddit/Sidebar'

export const metadata = createPageMetadata({
  title: 'Exam Room — the student community',
  description:
    'Reddit-style community for Cambridge A-Level and IB students: ask doubts, share cheat sheets and resources, and discuss grade boundaries and past papers.',
  path: '/community',
})

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<{ sort?: string; subject?: string; ask?: string }>
}

const SORTS: PostSort[] = ['hot', 'new', 'top', 'rising']

export default async function CommunityHomePage({ searchParams }: PageProps) {
  if (!isCommunityEnabled()) {
    return (
      <div className="ms-pg" style={{ paddingTop: 64, textAlign: 'center' }}>
        <p className="ms-overline">Exam Room</p>
        <h1 className="ms-h2">Coming soon</h1>
        <p className="ms-body-2" style={{ color: 'var(--ec-text-secondary)' }}>
          The student community is launching shortly.
        </p>
      </div>
    )
  }

  const sp = await searchParams
  // Legacy deep-links (?subject= / ?ask=) → route into the subject or composer.
  if (sp.ask === '1') {
    redirect(`/community/submit${sp.subject ? `?subject=${sp.subject}&kind=question` : '?kind=question'}`)
  }
  if (sp.subject) redirect(`/community/s/${sp.subject}`)

  const sort: PostSort = SORTS.includes(sp.sort as PostSort) ? (sp.sort as PostSort) : 'hot'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const posts = await listPosts({ sort, limit: 30 })
  const userVotes = user ? await getUserPostVotes(user.id, posts.map((p) => p.id)) : {}

  return (
    <div className="rc-page">
      <div className="rc-layout">
        <main className="rc-main">
          <CommunitySearchBar />
          <CreatePostBar signedIn={!!user} />
          <SortTabs active={sort} basePath="/community" />
          <PostFeed posts={posts} userVotes={userVotes} signedIn={!!user} />
        </main>
        <CommunitySidebar />
      </div>
    </div>
  )
}
