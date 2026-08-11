import { createServiceClient } from '@/lib/supabase-server'
import { clampNoteContent, stripRawHtml } from '@/lib/community/sanitize'
import type { CommunityAttachment } from '@/lib/community/uploads'
import { authorAccessMap } from '@/lib/community/author-access'
import { rankHot } from '@/lib/community/rank'
import type { PostUrlParts } from '@/lib/community/post-url'
import type { EffectiveAccess } from '@/lib/billing/access'

export type Board = 'cambridge' | 'ib'
export type PostKind = 'discussion' | 'question' | 'resource'
export type PostSort = 'hot' | 'new' | 'top' | 'rising'

export type CommunityPost = {
  id: string
  authorId: string
  authorUsername: string | null
  /** Subscription level, resolved live — drives the badge and the feed boost. */
  authorAccess: EffectiveAccess
  board: Board
  subjectCode: string
  topicCode: string | null
  lessonSlug: string | null
  questionId: string | null
  kind: PostKind
  flair: string | null
  title: string
  bodyMd: string
  attachments: CommunityAttachment[]
  upvotes: number
  downvotes: number
  score: number
  commentCount: number
  status: string
  isPinned: boolean
  isLocked: boolean
  createdAt: string
}

type Row = {
  id: string
  author_id: string
  board: Board
  subject_code: string
  topic_code: string | null
  lesson_slug: string | null
  question_id: string | null
  kind: PostKind
  flair: string | null
  title: string
  body_md: string
  attachments: CommunityAttachment[] | null
  upvotes: number
  downvotes: number
  score: number
  comment_count: number
  status: string
  is_pinned: boolean
  is_locked: boolean
  created_at: string
}

type Admin = ReturnType<typeof createServiceClient>

async function usernameMap(admin: Admin, ids: string[]) {
  if (!ids.length) return new Map<string, string | null>()
  const { data } = await admin
    .from('user_profiles')
    .select('id, username')
    .in('id', [...new Set(ids)])
  return new Map<string, string | null>((data ?? []).map((p) => [p.id, p.username]))
}

function mapRow(r: Row, username: string | null, access: EffectiveAccess = 'free'): CommunityPost {
  return {
    id: r.id,
    authorId: r.author_id,
    authorUsername: username,
    authorAccess: access,
    board: r.board,
    subjectCode: r.subject_code,
    topicCode: r.topic_code,
    lessonSlug: r.lesson_slug,
    questionId: r.question_id,
    kind: r.kind,
    flair: r.flair,
    title: r.title,
    bodyMd: r.body_md,
    attachments: Array.isArray(r.attachments) ? r.attachments : [],
    upvotes: r.upvotes,
    downvotes: r.downvotes,
    score: r.score,
    commentCount: r.comment_count,
    status: r.status,
    isPinned: r.is_pinned,
    isLocked: r.is_locked,
    createdAt: r.created_at,
  }
}

const SELECT =
  'id, author_id, board, subject_code, topic_code, lesson_slug, question_id, kind, flair, title, body_md, attachments, upvotes, downvotes, score, comment_count, status, is_pinned, is_locked, created_at'

export async function listPosts(params: {
  board?: Board
  subjectCode?: string
  topicCode?: string
  lessonSlug?: string
  questionId?: string
  kind?: PostKind
  authorId?: string
  sort?: PostSort
  limit?: number
}): Promise<CommunityPost[]> {
  const admin = createServiceClient()
  let q = admin.from('community_posts').select(SELECT).eq('status', 'published')

  if (params.board) q = q.eq('board', params.board)
  if (params.subjectCode) q = q.eq('subject_code', params.subjectCode)
  if (params.topicCode) q = q.eq('topic_code', params.topicCode)
  if (params.lessonSlug) q = q.eq('lesson_slug', params.lessonSlug)
  if (params.questionId) q = q.eq('question_id', params.questionId)
  if (params.kind) q = q.eq('kind', params.kind)
  if (params.authorId) q = q.eq('author_id', params.authorId)

  const sort = params.sort ?? 'hot'
  if (sort === 'new') q = q.order('created_at', { ascending: false })
  else if (sort === 'top') q = q.order('score', { ascending: false }).order('created_at', { ascending: false })
  else if (sort === 'rising')
    q = q.order('comment_count', { ascending: false }).order('created_at', { ascending: false })
  else q = q.order('is_pinned', { ascending: false }).order('hot_rank', { ascending: false })

  const limit = Math.min(params.limit ?? 25, 100)
  // `hot` is re-ranked below with the subscriber boost, so pull a wider window
  // first — otherwise a boosted post sitting just outside the DB's top N could
  // never climb into it. The other sorts are exact as the DB returns them.
  const isHot = sort === 'hot'
  q = q.limit(isHot ? Math.min(limit * 3, 300) : limit)

  const { data } = await q
  const rows = (data ?? []) as Row[]
  const authorIds = rows.map((r) => r.author_id)
  const [names, access] = await Promise.all([
    usernameMap(admin, authorIds),
    authorAccessMap(admin, authorIds),
  ])
  const posts = rows.map((r) =>
    mapRow(r, names.get(r.author_id) ?? null, access.get(r.author_id) ?? 'free')
  )

  return isHot ? rankHot(posts).slice(0, limit) : posts
}

/**
 * Resolve the 8-hex short id used in public URLs.
 *
 * Expressed as a range over the primary key rather than a LIKE on the id cast
 * to text: `b5000001…` is every uuid between b5000001-0000-… and b5000001-ffff-…,
 * so this is an index scan on the PK and needs no extra index to stay fast.
 */
/**
 * Everything indexable, for the sitemap.
 *
 * Publisher-authored and thin posts are filtered by the caller via
 * `isIndexablePost` — listing a page we mark noindex would ask Google to crawl
 * something we have told it to ignore.
 */
export async function listPostRefs(): Promise<
  (PostUrlParts & {
    updatedAt: string | null
    authorId: string
    authorUsername: string | null
    bodyMd: string
    peerReplyCount: number
  })[]
> {
  const admin = createServiceClient()
  const { data } = await admin
    .from('community_posts')
    .select('id, author_id, subject_code, title, body_md, comment_count, updated_at')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })
    .limit(5000)

  const rows = (data ?? []) as {
    id: string
    author_id: string
    subject_code: string
    title: string
    body_md: string
    comment_count: number
    updated_at: string | null
  }[]
  const [names, { data: commentRows }] = await Promise.all([
    usernameMap(admin, rows.map((r) => r.author_id)),
    admin
      .from('community_comments')
      .select('post_id, author_id')
      .eq('status', 'published')
      .in('post_id', rows.map((r) => r.id).slice(0, 500)),
  ])

  // Self-replies excluded: a thread the author bumped alone is not discussion,
  // and indexing it would put an empty page in front of a searcher.
  const authorById = new Map(rows.map((r) => [r.id, r.author_id]))
  const peerReplies = new Map<string, number>()
  for (const c of commentRows ?? []) {
    const postId = c.post_id as string
    if (authorById.get(postId) === c.author_id) continue
    peerReplies.set(postId, (peerReplies.get(postId) ?? 0) + 1)
  }

  return rows.map((r) => ({
    id: r.id,
    subjectCode: r.subject_code,
    title: r.title,
    updatedAt: r.updated_at,
    authorId: r.author_id,
    authorUsername: names.get(r.author_id) ?? null,
    bodyMd: r.body_md ?? '',
    peerReplyCount: peerReplies.get(r.id) ?? 0,
  }))
}

export async function getPostByShortId(shortId: string): Promise<CommunityPost | null> {
  const short = shortId.toLowerCase()
  if (!/^[0-9a-f]{8}$/.test(short)) return null

  const admin = createServiceClient()
  const { data } = await admin
    .from('community_posts')
    .select(SELECT)
    .gte('id', `${short}-0000-0000-0000-000000000000`)
    .lte('id', `${short}-ffff-ffff-ffff-ffffffffffff`)
    .limit(2)

  const rows = (data ?? []) as Row[]
  // Two posts sharing eight hex characters is a 1-in-4-billion accident; if it
  // ever happens, refusing beats silently showing the wrong thread.
  if (rows.length !== 1) return null

  const row = rows[0]
  const [names, access] = await Promise.all([
    usernameMap(admin, [row.author_id]),
    authorAccessMap(admin, [row.author_id]),
  ])
  return mapRow(row, names.get(row.author_id) ?? null, access.get(row.author_id) ?? 'free')
}

export async function getPost(id: string): Promise<CommunityPost | null> {
  const admin = createServiceClient()
  const { data } = await admin.from('community_posts').select(SELECT).eq('id', id).maybeSingle()
  if (!data) return null
  const row = data as Row
  const [names, access] = await Promise.all([
    usernameMap(admin, [row.author_id]),
    authorAccessMap(admin, [row.author_id]),
  ])
  return mapRow(row, names.get(row.author_id) ?? null, access.get(row.author_id) ?? 'free')
}

export type CreatePostInput = {
  authorId: string
  board: Board
  subjectCode: string
  subjectName?: string
  topicCode?: string | null
  lessonSlug?: string | null
  questionId?: string | null
  kind: PostKind
  flair?: string | null
  title: string
  bodyMd?: string
  attachments?: CommunityAttachment[]
}

export type CreatePostResult =
  | { ok: true; id: string; status: string; reason?: string | null }
  | { ok: false; error: string }

export async function createPost(input: CreatePostInput): Promise<CreatePostResult> {
  const title = input.title.trim()
  if (title.length < 5) return { ok: false, error: 'Add a clearer title (at least 5 characters).' }
  if (title.length > 200) return { ok: false, error: 'Title is too long (max 200 characters).' }

  const body = clampNoteContent(stripRawHtml(input.bodyMd ?? ''), 20000)
  const attachments = (input.attachments ?? []).slice(0, 10)

  if (input.kind !== 'resource' && body.trim().length < 1 && attachments.length === 0) {
    return { ok: false, error: 'Add some text to your post.' }
  }

  const admin = createServiceClient()
  const { data, error } = await admin
    .from('community_posts')
    .insert({
      author_id: input.authorId,
      board: input.board,
      subject_code: input.subjectCode,
      topic_code: input.topicCode ?? null,
      lesson_slug: input.lessonSlug ?? null,
      question_id: input.questionId ?? null,
      kind: input.kind,
      flair: input.flair ?? null,
      title,
      body_md: body,
      attachments,
      status: 'published',
      moderation_reason: null,
    })
    .select('id')
    .single()

  if (error || !data) return { ok: false, error: 'Could not publish your post.' }

  // Author auto-upvote (Reddit behaviour) — trigger recomputes score + hot_rank.
  await admin.from('community_post_votes').insert({ post_id: data.id, user_id: input.authorId, value: 1 })

  return { ok: true, id: data.id, status: 'published' }
}

/** Toggle/set a user's vote on a post. Returns the new vote value (-1/0/1). */
export async function votePost(postId: string, userId: string, value: -1 | 1): Promise<number> {
  const admin = createServiceClient()
  const { data: existing } = await admin
    .from('community_post_votes')
    .select('value')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing?.value === value) {
    await admin.from('community_post_votes').delete().eq('post_id', postId).eq('user_id', userId)
    return 0
  }
  await admin
    .from('community_post_votes')
    .upsert({ post_id: postId, user_id: userId, value }, { onConflict: 'post_id,user_id' })
  return value
}

/** Map of postId → the signed-in user's vote value. */
export async function getUserPostVotes(userId: string, postIds: string[]): Promise<Record<string, number>> {
  if (!postIds.length) return {}
  const admin = createServiceClient()
  const { data } = await admin
    .from('community_post_votes')
    .select('post_id, value')
    .eq('user_id', userId)
    .in('post_id', postIds)
  const out: Record<string, number> = {}
  for (const row of data ?? []) out[row.post_id as string] = row.value as number
  return out
}
