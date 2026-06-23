import { redirect } from 'next/navigation'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { createPageMetadata } from '@/lib/seo/metadata'
import { createClient } from '@/lib/supabase-server'
import { listPosts, getUserPostVotes, type Board, type PostSort } from '@/lib/community/posts'
import { CreatePostBar } from '@/components/community/reddit/CreatePostBar'
import { CommunitySearchBar } from '@/components/community/reddit/CommunitySearchBar'
import { SortTabs } from '@/components/community/reddit/SortTabs'
import { BoardTabs } from '@/components/community/reddit/BoardTabs'
import { PostFeed } from '@/components/community/reddit/PostFeed'
import { CommunitySidebar } from '@/components/community/reddit/Sidebar'
import { CommunityLeftRail } from '@/components/community/reddit/CommunityLeftRail'
import { CommunityHubIntro, CommunityHubFaq } from '@/components/community/reddit/CommunityHubSeo'
import { ensureCommunitySeed } from '@/lib/community/ensure-seed'

export const metadata = createPageMetadata({
  title: 'Exam Room — Cambridge A-Level & IB student community',
  description:
    'Free Reddit-style community for Cambridge A-Level and IB Diploma students. Ask past-paper doubts, share cheat sheets and PDFs, discuss grade boundaries, and help each other revise — every subject has its own room.',
  path: '/community',
  keywords: [
    'Cambridge A Level forum',
    'IB Diploma discussion',
    'past paper help',
    'grade boundaries discussion',
    'A Level revision community',
    'IB study group',
    '9702 physics help',
    'math AA HL IA',
    'student cheat sheets',
  ],
})

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<{ sort?: string; subject?: string; ask?: string; board?: string }>
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
  if (sp.ask === '1') {
    redirect(`/community/submit${sp.subject ? `?subject=${sp.subject}&kind=question` : '?kind=question'}`)
  }
  if (sp.subject) redirect(`/community/s/${sp.subject}`)

  const sort: PostSort = SORTS.includes(sp.sort as PostSort) ? (sp.sort as PostSort) : 'hot'
  const board: Board | 'all' =
    sp.board === 'cambridge' || sp.board === 'ib' ? sp.board : 'all'

  await ensureCommunitySeed()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const posts = await listPosts({
    sort,
    board: board === 'all' ? undefined : board,
    limit: 30,
  })
  const userVotes = user ? await getUserPostVotes(user.id, posts.map((p) => p.id)) : {}

  const emptyLabel =
    board === 'cambridge'
      ? 'No Cambridge A-Level posts yet — start a discussion.'
      : board === 'ib'
        ? 'No IB Diploma posts yet — start a discussion.'
        : 'No posts yet. Be the first to start a discussion.'

  return (
    <div className="rc-page rc-page--hub">
      <CommunityHubIntro board={board === 'all' ? undefined : board} />
      <div className="rc-layout rc-layout--hub">
        <CommunityLeftRail board={board} />
        <main className="rc-main">
          <div className="rc-feed-toolbar">
            <CommunitySearchBar />
            <CreatePostBar signedIn={!!user} board={board === 'all' ? undefined : board} />
            <BoardTabs active={board} basePath="/community" sort={sort} />
            <SortTabs active={sort} basePath={board === 'all' ? '/community' : `/community?board=${board}`} />
          </div>
          <PostFeed posts={posts} userVotes={userVotes} signedIn={!!user} emptyLabel={emptyLabel} />
        </main>
        <CommunitySidebar board={board} />
      </div>
      <CommunityHubFaq />
    </div>
  )
}
