import { createServiceClient } from '@/lib/supabase-server'

export async function getSubjectCommunityCounts(subjectCode: string) {
  const admin = createServiceClient()
  const [{ count: noteCount }, { count: questionCount }] = await Promise.all([
    admin
      .from('community_notes')
      .select('id', { count: 'exact', head: true })
      .eq('subject_code', subjectCode)
      .eq('status', 'published'),
    admin
      .from('community_questions')
      .select('id', { count: 'exact', head: true })
      .eq('subject_code', subjectCode)
      .eq('status', 'published'),
  ])
  return { notes: noteCount ?? 0, questions: questionCount ?? 0 }
}

/** Total published posts for a subject's "subreddit". */
export async function getSubjectPostCount(subjectCode: string): Promise<number> {
  const admin = createServiceClient()
  const { count } = await admin
    .from('community_posts')
    .select('id', { count: 'exact', head: true })
    .eq('subject_code', subjectCode)
    .eq('status', 'published')
  return count ?? 0
}

/** Map of subjectCode → published post count, for the subjects rail. */
export async function getPostCountsBySubject(): Promise<Record<string, number>> {
  const admin = createServiceClient()
  const { data } = await admin
    .from('community_posts')
    .select('subject_code')
    .eq('status', 'published')
    .limit(5000)
  const out: Record<string, number> = {}
  for (const row of data ?? []) {
    const code = row.subject_code as string
    out[code] = (out[code] ?? 0) + 1
  }
  return out
}
