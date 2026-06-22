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
