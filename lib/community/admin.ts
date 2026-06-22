import { createServiceClient } from '@/lib/supabase-server'
import type { CommunityNote } from '@/lib/community/notes'

/** Notes needing moderator attention: auto-flagged (reports) or held by the AI gate. */
export async function getModerationQueue(): Promise<(CommunityNote & { reportCount: number })[]> {
  const admin = createServiceClient()
  const { data: rows } = await admin
    .from('community_notes')
    .select('*')
    .in('status', ['flagged', 'needs_edit'])
    .order('updated_at', { ascending: false })
    .limit(100)
  const notes = (rows ?? []) as Array<Record<string, unknown>>
  if (!notes.length) return []

  const authorIds = [...new Set(notes.map((r) => r.author_id as string))]
  const noteIds = notes.map((r) => r.id as string)
  const [{ data: profiles }, { data: reports }] = await Promise.all([
    admin.from('user_profiles').select('id, username').in('id', authorIds),
    admin
      .from('community_reports')
      .select('target_id')
      .eq('target_type', 'note')
      .eq('status', 'open')
      .in('target_id', noteIds),
  ])
  const userById = new Map<string, string | null>((profiles ?? []).map((p) => [p.id, p.username]))
  const reportCounts = new Map<string, number>()
  for (const r of reports ?? []) {
    const id = r.target_id as string
    reportCounts.set(id, (reportCounts.get(id) ?? 0) + 1)
  }
  return notes.map((r) => ({
    id: r.id as string,
    authorId: r.author_id as string,
    authorUsername: userById.get(r.author_id as string) ?? null,
    board: r.board as 'cambridge' | 'ib',
    subjectCode: r.subject_code as string,
    topicCode: (r.topic_code as string) ?? null,
    lessonSlug: (r.lesson_slug as string) ?? null,
    title: r.title as string,
    contentMd: r.content_md as string,
    imagePaths: (r.image_paths as string[]) ?? [],
    status: r.status as string,
    upvoteCount: r.upvote_count as number,
    saveCount: r.save_count as number,
    createdAt: r.created_at as string,
    reportCount: reportCounts.get(r.id as string) ?? 0,
  }))
}
