import { topicToLessonSlug } from '@/lib/courses/slug'
import type { AttemptLite, TopicMastery } from '@/lib/mastery'
import type { GradePrediction } from '@/lib/prediction'
import type { AccentToken } from '@/lib/courses/margin-notes/types'
import { subjectAccent } from '@/lib/courses/margin-notes/subject-meta'
import type { AttemptListRow } from '@/components/progress/AttemptsList'
import type { Recommendation } from '@/lib/insights/types'
import { drillHref } from '@/lib/insights/drill-link'

type AttemptRow = AttemptListRow & {
  error_classifications?: { description?: string }[] | null
}

export type RecentMark = {
  id: string
  ref: string
  got: number
  of: number
  when: string
  note: string
  href: string
}

export type WeakTopicRow = {
  code: string
  n: string
  t: string
  acc: AccentToken
  href: string
}

export type ContinueCourseRow = {
  code: string
  name: string
  acc: AccentToken
  prog: number
  href: string
}

export type DashStat = { n: string; l: string }

export type StreakDay = { label: string; active: boolean }

function scheme(row: AttemptRow) {
  const ms = row.mark_schemes
  if (!ms) return null
  return Array.isArray(ms) ? ms[0] ?? null : ms
}

function formatWhen(iso: string): string {
  const then = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - then.getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return then.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
}

function attemptNote(row: AttemptRow, full: boolean): string {
  if (full) return 'full marks — clean method'
  const err = row.error_classifications?.[0]
  if (err?.description) return err.description
  return 'lost marks — review your working against the scheme'
}

function attemptRef(row: AttemptRow): string {
  const ms = scheme(row)
  const tag = row.syllabus_tags?.[0]
  const topicName = tag ? ` · ${tag}` : ''
  if (row.source_type === 'past_paper' && ms?.paper_code) {
    return `${ms.paper_code} · Q${ms.question_number ?? '?'}${topicName}`
  }
  const preview = (row.question_text || 'Custom question').slice(0, 40)
  return `Custom · ${preview}${(row.question_text || '').length > 40 ? '…' : ''}`
}

export function adaptRecentMarks(attempts: AttemptRow[], limit = 5): RecentMark[] {
  return attempts.slice(0, limit).map((row) => {
    const got = row.marks_earned
    const of = row.total_marks
    const full = of > 0 && got === of
    return {
      id: row.id,
      ref: attemptRef(row),
      got,
      of,
      when: formatWhen(row.created_at),
      note: attemptNote(row, full),
      href: `/dashboard/attempt/${row.id}`,
    }
  })
}

export function adaptStreakWeek(timestamps: Date[]): StreakDay[] {
  const activeDays = new Set(timestamps.map((t) => t.toISOString().slice(0, 10)))
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const days: StreakDay[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    const key = d.toISOString().slice(0, 10)
    days.push({
      label: labels[d.getUTCDay()],
      active: activeDays.has(key),
    })
  }
  return days
}

export function adaptDashStats(
  allAttempts: AttemptLite[],
  topicsCovered: number,
  prediction: GradePrediction,
  primarySubjectCode: string
): DashStat[] {
  const count = allAttempts.length
  const avg =
    count > 0
      ? Math.round(
          allAttempts.reduce((sum, a) => {
            if (a.total_marks <= 0) return sum
            return sum + (a.marks_earned / a.total_marks) * 100
          }, 0) / count
        )
      : 0

  const gradeLabel =
    prediction.predictedGrade !== '—'
      ? `projected grade · ${primarySubjectCode}`
      : `projected grade`

  return [
    { n: String(count), l: 'questions marked' },
    { n: count > 0 ? `${avg}%` : '—', l: 'average mark' },
    { n: String(topicsCovered), l: 'topics covered' },
    {
      n: prediction.predictedGrade !== '—' ? prediction.predictedGrade : '—',
      l: gradeLabel,
    },
  ]
}

function lessonHref(subjectCode: string, topicCode: string, topicName: string): string {
  return `/courses/${subjectCode}/${topicToLessonSlug(topicCode, topicName)}`
}

export function adaptWeakTopics(
  masteries: TopicMastery[],
  subjectCode: string,
  limit = 3
): WeakTopicRow[] {
  return masteries
    .filter((m) => m.level === 'critical' || m.level === 'sampled')
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, limit)
    .map((m) => ({
      code: subjectCode,
      n: m.code,
      t: m.name,
      acc: subjectAccent(subjectCode),
      href: lessonHref(subjectCode, m.code, m.name),
    }))
}

export function adaptWeakFromRecommendations(
  recommendations: Recommendation[],
  subjectCode: string,
  limit = 3
): WeakTopicRow[] {
  return recommendations.slice(0, limit).map((r) => {
    const tag = r.topicCode ?? '—'
    return {
      code: subjectCode,
      n: tag,
      t: r.targetLabel,
      acc: subjectAccent(subjectCode),
      href: drillHref(r),
    }
  })
}

export function adaptContinueCourses(
  courses: { code: string; name: string; prog: number }[]
): ContinueCourseRow[] {
  return courses
    .filter((c) => c.prog > 0)
    .map((c) => ({
      code: c.code,
      name: c.name,
      acc: subjectAccent(c.code),
      prog: c.prog,
      href: `/courses/${c.code}`,
    }))
}

export function adaptMilestone(
  actionItems: { title: string; body?: string }[],
  heroTip?: string
): string | undefined {
  if (actionItems[0]?.title) {
    return actionItems[0].body
      ? `${actionItems[0].title} — ${actionItems[0].body}`
      : actionItems[0].title
  }
  return heroTip || undefined
}
