import { createServiceClient } from '@/lib/supabase-server'
import { calculateMastery, type AttemptLite } from '@/lib/mastery'

export type MasterySignals = {
  examReadyTopics: Set<string>
  weakTopics: Set<string>
  subjects: string[]
}

/** Topic codes where the student is strong vs struggling — powers Exam Room personalization. */
export async function getUserMasterySignals(userId: string): Promise<MasterySignals> {
  const admin = createServiceClient()
  const [{ data: profile }, { data: attempts }] = await Promise.all([
    admin.from('user_profiles').select('subjects').eq('id', userId).maybeSingle(),
    admin
      .from('attempts')
      .select('marks_earned, total_marks, syllabus_tags, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(400),
  ])

  const subjects = (profile?.subjects as string[] | null) ?? []
  const rows = (attempts ?? []) as AttemptLite[]
  const examReadyTopics = new Set<string>()
  const weakTopics = new Set<string>()

  for (const code of subjects) {
    if (!rows.length) continue
    const masteries = calculateMastery(rows, code)
    for (const m of masteries) {
      if (m.level === 'exam_ready') examReadyTopics.add(m.code)
      if (m.level === 'critical' || m.level === 'sampled') weakTopics.add(m.code)
    }
  }

  return { examReadyTopics, weakTopics, subjects }
}
