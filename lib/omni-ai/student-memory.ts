import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { computeWeeklyReportData } from '@/lib/reports/weekly-report'
import type { AttemptWithPaper } from '@/lib/syllabi/attempts'

// Short TTL: coaching should notice a fresh mark within a minute if invalidation
// is missed. Prefer invalidateStudentMemoryCache() after attempt writes.
const MEMORY_TTL_MS = 60 * 1000
const memoryCache = new Map<string, { at: number; value: string | null }>()

/** Drop cached Omni student memory after a new mark lands. */
export function invalidateStudentMemoryCache(userId: string | null | undefined) {
  if (!userId) return
  memoryCache.delete(userId)
}

/**
 * A compact profile of the student's marked work — weak topics, grade trajectory
 * vs target, weekly activity, exam countdown — injected into Omni's system prompt
 * so the tutor coaches with memory. Reuses the weekly-report computation. Returns
 * null when the student has no marked work yet (nothing to remember).
 *
 * Cached briefly per user so back-to-back chat turns don't recompute over 100
 * attempts every message.
 */
export async function buildStudentMemoryBlock(
  admin: SupabaseClient,
  userId: string
): Promise<string | null> {
  const cached = memoryCache.get(userId)
  if (cached && Date.now() - cached.at < MEMORY_TTL_MS) {
    return cached.value
  }

  const value = await computeStudentMemoryBlock(admin, userId)
  memoryCache.set(userId, { at: Date.now(), value })
  return value
}

async function computeStudentMemoryBlock(
  admin: SupabaseClient,
  userId: string
): Promise<string | null> {
  const [{ data: profile }, { data: rawAttempts }] = await Promise.all([
    admin
      .from('user_profiles')
      .select('target_grade, exam_date')
      .eq('id', userId)
      .maybeSingle(),
    admin
      .from('attempts')
      .select(
        'id, marks_earned, total_marks, syllabus_tags, created_at, mark_schemes ( paper_code )'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const attempts = (rawAttempts || []) as unknown as AttemptWithPaper[]
  if (attempts.length === 0) return null

  const d = computeWeeklyReportData(attempts, {
    target_grade: (profile?.target_grade as string | null) ?? null,
    exam_date: (profile?.exam_date as string | null) ?? null,
  })

  const lines: string[] = []
  if (d.marksThisWeek > 0 && d.avgPctThisWeek !== null) {
    lines.push(
      `- Marked ${d.marksThisWeek} question${d.marksThisWeek === 1 ? '' : 's'} this week, averaging ${Math.round(d.avgPctThisWeek)}%.`
    )
  }
  if (d.predictedGrade) {
    const subject = d.primarySubjectLabel ? ` in ${d.primarySubjectLabel}` : ''
    if (d.targetGrade) {
      const gap = d.onTrackForTarget
        ? ' — on track'
        : d.pointsToTarget !== null
          ? ` (about ${d.pointsToTarget}% to go)`
          : ''
      lines.push(
        `- Tracking grade ${d.predictedGrade}${subject}; target ${d.targetGrade}${gap}.`
      )
    } else {
      lines.push(`- Tracking grade ${d.predictedGrade}${subject}.`)
    }
  }
  if (d.weakestTopicName) {
    lines.push(
      `- Weakest topic right now: ${d.weakestTopicName}${d.weakestSubjectLabel ? ` (${d.weakestSubjectLabel})` : ''} — the biggest mark gain available.`
    )
  }
  if (d.examDaysLeft !== null) {
    lines.push(`- ${d.examDaysLeft} day${d.examDaysLeft === 1 ? '' : 's'} until their exam.`)
  }

  return lines.length ? lines.join('\n') : null
}
