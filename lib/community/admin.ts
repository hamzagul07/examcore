import { createServiceClient } from '@/lib/supabase-server'
import type { CommunityNote } from '@/lib/community/notes'

export type ModerationItem = {
  id: string
  targetType: 'note' | 'question' | 'answer'
  title: string
  body: string
  authorId: string
  authorUsername: string | null
  board?: 'cambridge' | 'ib'
  subjectCode?: string
  status: string
  reportCount: number
  createdAt: string
}

/** Content needing moderator attention across notes, questions, and answers. */
export async function getModerationQueue(): Promise<ModerationItem[]> {
  const admin = createServiceClient()
  const [{ data: notes }, { data: questions }, { data: answers }] = await Promise.all([
    admin
      .from('community_notes')
      .select('*')
      .in('status', ['flagged', 'needs_edit'])
      .order('updated_at', { ascending: false })
      .limit(50),
    admin
      .from('community_questions')
      .select('*')
      .in('status', ['flagged', 'needs_edit'])
      .order('updated_at', { ascending: false })
      .limit(50),
    admin
      .from('community_answers')
      .select('*')
      .in('status', ['flagged', 'needs_edit'])
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const authorIds = [
    ...new Set([
      ...(notes ?? []).map((r) => r.author_id as string),
      ...(questions ?? []).map((r) => r.author_id as string),
      ...(answers ?? []).map((r) => r.author_id as string),
    ]),
  ]
  const targetIds = [
    ...(notes ?? []).map((r) => ({ type: 'note', id: r.id as string })),
    ...(questions ?? []).map((r) => ({ type: 'question', id: r.id as string })),
    ...(answers ?? []).map((r) => ({ type: 'answer', id: r.id as string })),
  ]

  const { data: profiles } = authorIds.length
    ? await admin.from('user_profiles').select('id, username').in('id', authorIds)
    : { data: [] }
  const userById = new Map<string, string | null>((profiles ?? []).map((p) => [p.id, p.username]))

  const reportCounts = new Map<string, number>()
  for (const t of targetIds) {
    const { count } = await admin
      .from('community_reports')
      .select('id', { count: 'exact', head: true })
      .eq('target_type', t.type)
      .eq('target_id', t.id)
      .eq('status', 'open')
    reportCounts.set(`${t.type}:${t.id}`, count ?? 0)
  }

  const items: ModerationItem[] = [
    ...(notes ?? []).map((r) => ({
      id: r.id as string,
      targetType: 'note' as const,
      title: r.title as string,
      body: (r.content_md as string).slice(0, 280),
      authorId: r.author_id as string,
      authorUsername: userById.get(r.author_id as string) ?? null,
      board: r.board as 'cambridge' | 'ib',
      subjectCode: r.subject_code as string,
      status: r.status as string,
      reportCount: reportCounts.get(`note:${r.id}`) ?? 0,
      createdAt: r.created_at as string,
    })),
    ...(questions ?? []).map((r) => ({
      id: r.id as string,
      targetType: 'question' as const,
      title: r.title as string,
      body: (r.body_md as string).slice(0, 280),
      authorId: r.author_id as string,
      authorUsername: userById.get(r.author_id as string) ?? null,
      board: r.board as 'cambridge' | 'ib',
      subjectCode: r.subject_code as string,
      status: r.status as string,
      reportCount: reportCounts.get(`question:${r.id}`) ?? 0,
      createdAt: r.created_at as string,
    })),
    ...(answers ?? []).map((r) => ({
      id: r.id as string,
      targetType: 'answer' as const,
      title: 'Answer',
      body: (r.body_md as string).slice(0, 280),
      authorId: r.author_id as string,
      authorUsername: userById.get(r.author_id as string) ?? null,
      status: r.status as string,
      reportCount: reportCounts.get(`answer:${r.id}`) ?? 0,
      createdAt: r.created_at as string,
    })),
  ]

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100)
}

/** @deprecated Use getModerationQueue */
export async function getNoteModerationQueue(): Promise<(CommunityNote & { reportCount: number })[]> {
  const items = await getModerationQueue()
  return items
    .filter((i) => i.targetType === 'note')
    .map((i) => ({
      id: i.id,
      authorId: i.authorId,
      authorUsername: i.authorUsername,
      board: i.board!,
      subjectCode: i.subjectCode!,
      topicCode: null,
      lessonSlug: null,
      questionId: null,
      title: i.title,
      contentMd: i.body,
      imagePaths: [],
      status: i.status,
      upvoteCount: 0,
      saveCount: 0,
      createdAt: i.createdAt,
      reportCount: i.reportCount,
    }))
}
