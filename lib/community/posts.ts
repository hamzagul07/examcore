import { createServiceClient } from '@/lib/supabase-server'
import { clampNoteContent, stripRawHtml } from '@/lib/community/sanitize'
import type { CommunityAttachment } from '@/lib/community/uploads'

export type Board = 'cambridge' | 'ib'
export type PostKind = 'discussion' | 'question' | 'resource'
export type PostSort = 'hot' | 'new' | 'top' | 'rising'

export type CommunityPost = {
  id: string
  authorId: string
  authorUsername: string | null
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

function mapRow(r: Row, username: string | null): CommunityPost {
  return {
    id: r.id,
    authorId: r.author_id,
    authorUsername: username,
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

  q = q.limit(Math.min(params.limit ?? 25, 100))

  const { data } = await q
  const rows = (data ?? []) as Row[]
  const names = await usernameMap(admin, rows.map((r) => r.author_id))
  return rows.map((r) => mapRow(r, names.get(r.author_id) ?? null))
}

export async function getPost(id: string): Promise<CommunityPost | null> {
  const admin = createServiceClient()
  const { data } = await admin.from('community_posts').select(SELECT).eq('id', id).maybeSingle()
  if (!data) return null
  const row = data as Row
  const names = await usernameMap(admin, [row.author_id])
  return mapRow(row, names.get(row.author_id) ?? null)
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
