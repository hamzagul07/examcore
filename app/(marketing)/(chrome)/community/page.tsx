import Link from 'next/link'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { createPageMetadata } from '@/lib/seo/metadata'
import { createClient } from '@/lib/supabase-server'
import { listPosts, getUserPostVotes, type Board, type PostSort } from '@/lib/community/posts'
import { listQuestions } from '@/lib/community/qa'
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
      <div className="ms-pg mx-auto max-w-lg" style={{ paddingTop: 64, textAlign: 'center' }}>
        <p className="ms-overline">Exam Room</p>
        <h1 className="ms-h2">Coming soon</h1>
        <p className="ms-body-2" style={{ color: 'var(--ec-text-secondary)' }}>
          The student community is launching shortly. In the meantime you can mark past papers,
          browse free courses, or read the FAQ.
        </p>
        <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <Link href="/mark" className="ec-btn-primary min-h-[48px] justify-center">
            Mark a question
          </Link>
          <Link href="/faq" className="ec-btn-ghost min-h-[48px] justify-center">
            FAQ
          </Link>
        </div>
      </div>
    )
  }

  const sp = await searchParams

  const sort: PostSort = SORTS.includes(sp.sort as PostSort) ? (sp.sort as PostSort) : 'hot'
  const board: Board | 'all' =
    sp.board === 'cambridge' || sp.board === 'ib' ? sp.board : 'all'
  const boardFilter = board === 'all' ? undefined : board

  await ensureCommunitySeed()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Independent reads after auth (COM-01) — do not serialise posts behind questions.
  const [posts, featuredQuestions] = await Promise.all([
    listPosts({
      sort,
      board: boardFilter,
      limit: 30,
    }),
    listQuestions({
      board: boardFilter,
      limit: 6,
    }),
  ])
  const userVotes = user ? await getUserPostVotes(user.id, posts.map((p) => p.id)) : {}

  const emptyLabel =
    board === 'cambridge'
      ? 'No Cambridge A-Level posts yet — start a discussion.'
      : board === 'ib'
        ? 'No IB Diploma posts yet — start a discussion.'
        : 'No posts yet. Be the first to start a discussion.'

  const feedBase = board === 'all' ? '/community' : `/community?board=${board}`

  return (
    <div className="rc-page rc-page--hub">
      <CommunityHubIntro board={boardFilter} />
      <div className="rc-layout rc-layout--hub">
        <CommunityLeftRail board={board} />
        <main className="rc-main">
          {/* Composer + feed first — model answers are secondary (COM-01). */}
          <div className="rc-feed-toolbar">
            <CommunitySearchBar />
            <CreatePostBar signedIn={!!user} board={boardFilter} />
            <div className="rc-feed-filters">
              <BoardTabs active={board} basePath="/community" sort={sort} />
              <SortTabs active={sort} basePath={feedBase} />
            </div>
          </div>
          <PostFeed posts={posts} userVotes={userVotes} signedIn={!!user} emptyLabel={emptyLabel} />

          {featuredQuestions.length ? (
            <details className="community-notes community-notes--after-feed">
              <summary className="community-notes-summary">
                <span className="community-notes-summary-title">Model answers</span>
                <span className="community-notes-summary-meta">
                  {featuredQuestions.length} worked past-paper answers
                </span>
              </summary>
              <ul className="community-note-list">
                {featuredQuestions.map((q) => (
                  <li key={q.id} className="community-note-row">
                    <Link href={`/community/questions/${q.id}`} className="community-note-main">
                      <span className="community-note-title">
                        {q.title}{' '}
                        {q.acceptedAnswerId ? (
                          <span className="community-solved">solved ✓</span>
                        ) : null}
                      </span>
                      <span className="community-note-meta">
                        {q.subjectCode} · {q.answerCount}{' '}
                        {q.answerCount === 1 ? 'answer' : 'answers'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </main>
        <CommunitySidebar board={board} />
      </div>
      <CommunityHubFaq />
    </div>
  )
}
