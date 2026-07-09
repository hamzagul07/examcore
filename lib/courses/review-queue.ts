import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'
import { calculateMastery, type MasteryLevel } from '@/lib/mastery'
import {
  getAttemptSubjectCode,
  type AttemptWithPaper,
} from '@/lib/syllabi/attempts'
import { hasSyllabusTree } from '@/lib/syllabi'
import { makeTopicLessonResolver } from '@/lib/courses/topic-lesson'
import { getSubjectByCode } from '@/lib/profile-options'
import {
  ERROR_LABELS,
  type ErrorClassificationDetail,
} from '@/lib/error-classifications'

export type ReviewItem = {
  subject: string
  subjectLabel: string
  code: string
  name: string
  level: MasteryLevel
  percentage: number
  attemptsCount: number
  daysSince: number
  topErrors: { label: string; icon: string }[]
  practiceHref: string
  lessonHref: string | null
}

const DAY_MS = 86_400_000
const INTERVAL_CAP_DAYS = 7
const ATTEMPT_SELECT = `
  marks_earned, total_marks, syllabus_tags, created_at, error_classifications,
  mark_schemes ( question_number, paper_code, paper_session )
`

function practiceHref(subject: string, topic: string): string {
  const p = new URLSearchParams({ subject, topic, return: '/dashboard/review' })
  return `/mark?${p.toString()}`
}

function topErrorsFor(
  attempts: AttemptWithPaper[]
): { label: string; icon: string }[] {
  const counts = new Map<string, number>()
  for (const a of attempts) {
    const errs = (a.error_classifications ?? []) as ErrorClassificationDetail[]
    for (const e of errs) {
      const key = e?.classification
      if (key && key in ERROR_LABELS) counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([key]) => ({
      label: ERROR_LABELS[key as keyof typeof ERROR_LABELS].label,
      icon: ERROR_LABELS[key as keyof typeof ERROR_LABELS].icon,
    }))
}

/**
 * Error-targeted spaced review: the student's weak topics across all subjects
 * they've practised, ranked by how "due" they are — weakest first, then stalest
 * (longest since last attempt). Each item links to re-practice and the fixing
 * lesson. Weak = critical or sampled (few/low-scoring attempts). Server-only.
 */
export async function buildReviewQueue(
  userId: string,
  limit = 15
): Promise<ReviewItem[]> {
  const admin = createServiceClient()
  const { data } = await admin
    .from('attempts')
    .select(ATTEMPT_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(400)

  const attempts = (data ?? []) as unknown as AttemptWithPaper[]
  if (!attempts.length) return []

  // Persisted spaced-repetition state (service-role only).
  type SchedRow = {
    interval_days: number
    due_at: string
    last_reviewed_at: string
  }
  const { data: schedRows } = await admin
    .from('review_schedule')
    .select('subject_code, topic_code, interval_days, due_at, last_reviewed_at')
    .eq('user_id', userId)
  const scheduleMap = new Map<string, SchedRow>()
  for (const r of (schedRows ?? []) as (SchedRow & {
    subject_code: string
    topic_code: string
  })[]) {
    scheduleMap.set(`${r.subject_code}::${r.topic_code}`, r)
  }
  const pendingUpserts: {
    user_id: string
    subject_code: string
    topic_code: string
    interval_days: number
    due_at: string
    last_reviewed_at: string
    updated_at: string
  }[] = []

  // Bucket attempts by resolved subject (only subjects with a syllabus tree).
  const bySubject = new Map<string, AttemptWithPaper[]>()
  for (const a of attempts) {
    const code = getAttemptSubjectCode(a)
    if (!code || !hasSyllabusTree(code)) continue
    const bucket = bySubject.get(code)
    if (bucket) bucket.push(a)
    else bySubject.set(code, [a])
  }

  const now = Date.now()
  const items: ReviewItem[] = []

  for (const [subject, subjectAttempts] of bySubject) {
    const resolve = makeTopicLessonResolver(subject)
    const subjectLabel = getSubjectByCode(subject)?.label ?? subject

    // Index this subject's attempts by topic code for staleness + error stats.
    const byTopic = new Map<string, AttemptWithPaper[]>()
    for (const a of subjectAttempts) {
      for (const tag of a.syllabus_tags ?? []) {
        const bucket = byTopic.get(tag)
        if (bucket) bucket.push(a)
        else byTopic.set(tag, [a])
      }
    }

    for (const m of calculateMastery(subjectAttempts, subject)) {
      if (m.level !== 'critical' && m.level !== 'sampled') continue
      const topicAttempts = byTopic.get(m.code) ?? []
      const lastAt = topicAttempts.reduce((max, a) => {
        const t = Date.parse(a.created_at)
        return Number.isNaN(t) ? max : Math.max(max, t)
      }, 0)
      const daysSince = lastAt ? Math.floor((now - lastAt) / DAY_MS) : 999

      // Reconcile spaced schedule: new weak topic → due now; re-practised since
      // last scheduled → grow the interval and snooze; else honour the due date.
      const existing = scheduleMap.get(`${subject}::${m.code}`)
      const lastReviewedMs = existing ? Date.parse(existing.last_reviewed_at) : 0
      let dueNow: boolean
      if (!existing) {
        dueNow = true
        pendingUpserts.push({
          user_id: userId,
          subject_code: subject,
          topic_code: m.code,
          interval_days: 1,
          due_at: new Date(now).toISOString(),
          last_reviewed_at: new Date(lastAt || now).toISOString(),
          updated_at: new Date(now).toISOString(),
        })
      } else if (lastAt && lastAt > lastReviewedMs) {
        const nextInterval = Math.min((existing.interval_days || 1) * 2, INTERVAL_CAP_DAYS)
        const nextDue = lastAt + nextInterval * DAY_MS
        dueNow = nextDue <= now
        pendingUpserts.push({
          user_id: userId,
          subject_code: subject,
          topic_code: m.code,
          interval_days: nextInterval,
          due_at: new Date(nextDue).toISOString(),
          last_reviewed_at: new Date(lastAt).toISOString(),
          updated_at: new Date(now).toISOString(),
        })
      } else {
        dueNow = Date.parse(existing.due_at) <= now
      }
      if (!dueNow) continue

      items.push({
        subject,
        subjectLabel,
        code: m.code,
        name: m.name,
        level: m.level,
        percentage: Math.round(m.percentage),
        attemptsCount: m.attemptsCount,
        daysSince,
        topErrors: topErrorsFor(topicAttempts),
        practiceHref: practiceHref(subject, m.code),
        lessonHref: resolve(m.code)?.href ?? null,
      })
    }
  }

  // Persist reconciled schedule (bounded: only new or re-practised topics).
  if (pendingUpserts.length) {
    await admin
      .from('review_schedule')
      .upsert(pendingUpserts, { onConflict: 'user_id,subject_code,topic_code' })
  }

  // Due-first: critical before sampled, then stalest, then weakest score.
  const levelRank: Partial<Record<MasteryLevel, number>> = { critical: 0, sampled: 1 }
  items.sort(
    (a, b) =>
      (levelRank[a.level]! - levelRank[b.level]!) ||
      b.daysSince - a.daysSince ||
      a.percentage - b.percentage
  )

  return items.slice(0, limit)
}
