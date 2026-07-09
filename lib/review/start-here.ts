import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'
import { getSubjectById, defaultSubjectsForProfile } from '@/lib/profile-options'

export type StartSubject = { code: string; label: string; markHref: string }

/**
 * The student's subjects with a "mark a question" deep-link — used to seed the
 * loop for a cold-start user (no marked attempts yet), so the review hub guides
 * them in instead of showing empty cards. Server-only.
 */
export async function getStartHereSubjects(userId: string): Promise<StartSubject[]> {
  const admin = createServiceClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('subjects, level, board')
    .eq('id', userId)
    .maybeSingle()

  const level = (profile?.level as string) ?? 'A-Level'
  const board = (profile?.board as string) ?? 'Cambridge International'
  const names = (profile?.subjects as string[] | null)?.length
    ? (profile!.subjects as string[])
    : defaultSubjectsForProfile(board, level)

  const seen = new Set<string>()
  const out: StartSubject[] = []
  for (const name of names) {
    const s = getSubjectById(name, level)
    if (!s || seen.has(s.code)) continue
    seen.add(s.code)
    out.push({
      code: s.code,
      label: s.label,
      markHref: `/mark?subject=${encodeURIComponent(s.code)}&return=%2Fdashboard%2Freview`,
    })
  }
  return out.slice(0, 6)
}
