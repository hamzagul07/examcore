import { createServiceClient } from '@/lib/supabase-server'
import type { CommunityNote, NoteRow } from '@/lib/community/notes-types'

function mapRow(r: NoteRow, username: string | null): CommunityNote {
  return {
    id: r.id,
    authorId: r.author_id,
    authorUsername: username,
    board: r.board,
    subjectCode: r.subject_code,
    topicCode: r.topic_code,
    lessonSlug: r.lesson_slug,
    questionId: r.question_id ?? null,
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
  rows: NoteRow[]
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
  board?: CommunityNote['board']
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
  return withAuthors(admin, (data ?? []) as NoteRow[])
}

export async function getNote(id: string): Promise<CommunityNote | null> {
  const admin = createServiceClient()
  const { data } = await admin.from('community_notes').select('*').eq('id', id).maybeSingle()
  if (!data) return null
  const [note] = await withAuthors(admin, [data as NoteRow])
  return note ?? null
}
