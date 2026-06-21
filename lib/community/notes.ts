import { createServiceClient } from '@/lib/supabase-server'
import { clampNoteContent } from '@/lib/community/sanitize'
import { screenContribution } from '@/lib/community/ai-screen'

export type Board = 'cambridge' | 'ib'

export type CommunityNote = {
  id: string
  authorId: string
  authorUsername: string | null
  board: Board
  subjectCode: string
  topicCode: string | null
  lessonSlug: string | null
  title: string
  contentMd: string
  imagePaths: string[]
  status: string
  upvoteCount: number
  saveCount: number
  createdAt: string
}

type Row = {
  id: string
  author_id: string
  board: Board
  subject_code: string
  topic_code: string | null
  lesson_slug: string | null
  title: string
  content_md: string
  image_paths: string[] | null
  status: string
  upvote_count: number
  save_count: number
  created_at: string
}

function mapRow(r: Row, username: string | null): CommunityNote {
  return {
    id: r.id,
    authorId: r.author_id,
    authorUsername: username,
    board: r.board,
    subjectCode: r.subject_code,
    topicCode: r.topic_code,
    lessonSlug: r.lesson_slug,
    title: r.title,
    contentMd: r.content_md,
    imagePaths: r.image_paths ?? [],
    status: r.status,
    upvoteCount: r.upvote_count,
    saveCount: r.save_count,
    createdAt: r.created_at,
  }
}

async function withAuthors(
  admin: ReturnType<typeof createServiceClient>,
  rows: Row[]
): Promise<CommunityNote[]> {
  if (!rows.length) return []
  const ids = [...new Set(rows.map((r) => r.author_id))]
  const { data: profiles } = await admin
    .from('user_profiles')
    .select('id, username')
    .in('id', ids)
  const byId = new Map<string, string | null>((profiles ?? []).map((p) => [p.id, p.username]))
  return rows.map((r) => mapRow(r, byId.get(r.author_id) ?? null))
}

export async function listNotes(params: {
  board?: Board
  subjectCode?: string
  topicCode?: string
  lessonSlug?: string
  authorId?: string
  limit?: number
}): Promise<CommunityNote[]> {
  const admin = createServiceClient()
  let q = admin
    .from('community_notes')
    .select('*')
    .eq('status', 'published')
    .order('upvote_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 50)
  if (params.board) q = q.eq('board', params.board)
  if (params.subjectCode) q = q.eq('subject_code', params.subjectCode)
  if (params.topicCode) q = q.eq('topic_code', params.topicCode)
  if (params.lessonSlug) q = q.eq('lesson_slug', params.lessonSlug)
  if (params.authorId) q = q.eq('author_id', params.authorId)
  const { data } = await q
  return withAuthors(admin, (data ?? []) as Row[])
}

export async function getNote(id: string): Promise<CommunityNote | null> {
  const admin = createServiceClient()
  const { data } = await admin.from('community_notes').select('*').eq('id', id).maybeSingle()
  if (!data) return null
  const [note] = await withAuthors(admin, [data as Row])
  return note ?? null
}

export type CreateNoteInput = {
  authorId: string
  board: Board
  subjectCode: string
  topicCode?: string | null
  lessonSlug?: string | null
  title: string
  contentMd: string
  imagePaths?: string[]
  subjectName?: string
}

export type CreateNoteResult =
  | { ok: true; id: string; status: string; reason?: string }
  | { ok: false; error: string }

/** Validate → Gemini screen → insert. Returns published or needs_edit per the gate. */
export async function createNote(input: CreateNoteInput): Promise<CreateNoteResult> {
  const title = (input.title || '').trim().slice(0, 140)
  const content = clampNoteContent((input.contentMd || '').trim())
  if (title.length < 4) return { ok: false, error: 'Give your note a title (at least 4 characters).' }
  if (content.length < 20) return { ok: false, error: 'Add a bit more detail (at least 20 characters).' }

  const verdict = await screenContribution({
    kind: 'note',
    title,
    body: content,
    subject: input.subjectName || input.subjectCode,
  })
  const status = verdict.ok ? 'published' : 'needs_edit'

  const admin = createServiceClient()
  const { data, error } = await admin
    .from('community_notes')
    .insert({
      author_id: input.authorId,
      board: input.board,
      subject_code: input.subjectCode,
      topic_code: input.topicCode ?? null,
      lesson_slug: input.lessonSlug ?? null,
      title,
      content_md: content,
      image_paths: input.imagePaths ?? [],
      status,
      moderation_reason: verdict.ok ? null : verdict.reason,
    })
    .select('id')
    .single()
  if (error || !data) {
    console.error('[community/notes] insert failed:', error)
    return { ok: false, error: 'Could not save your note. Please try again.' }
  }
  return { ok: true, id: data.id, status, reason: verdict.reason }
}
