/**
 * Builds a personalised Max exam pack from mastery + recommendations.
 * Points only at real mark_schemes rows / in-app routes — no invented papers.
 *
 * Sprint mode (exam within 14 days): 14-day plan with timed whole-paper blocks
 * interleaved with weak-topic drills. Normal mode: 7-day focus path.
 */
import type { LeafMastery } from '@/lib/mastery'
import {
  fetchGenericRecommendations,
  fetchTopicRecommendations,
  topicTargetsFromMasteries,
  type TopicTarget,
} from '@/lib/insights/recommendations'
import type { Recommendation } from '@/lib/insights/types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { examCountdown } from '@/lib/dashboard/exam-date'
import { MAX_SPRINT_WINDOW_DAYS } from '@/lib/billing/features'
import { getSyllabusSubjectName } from '@/lib/syllabi'

export type MaxExamPackDay = {
  day: number
  focus: string
  /** timed_paper = sit a past paper under time; drill = weak-topic questions */
  kind: 'timed_paper' | 'drill' | 'review'
  drills: Recommendation[]
  paperHref?: string
  minutes?: number
}

export type MaxExamPack = {
  subjectCode: string
  title: string
  weekLabel: string
  isSprint: boolean
  daysLeft: number | null
  weakTopics: TopicTarget[]
  days: MaxExamPackDay[]
  /** Three timed papers called out for the sprint gift copy. */
  timedPapers: Array<{ label: string; href: string; minutes: number }>
}

function isoWeekLabel(d = new Date()): string {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = start.getUTCDay() || 7
  start.setUTCDate(start.getUTCDate() - day + 1)
  return start.toISOString().slice(0, 10)
}

function paperHubHref(subjectCode: string): string {
  return `/past-papers/${encodeURIComponent(subjectCode)}`
}

export async function buildMaxExamPack(opts: {
  supabase: SupabaseClient
  subjectCode: string
  masteries: LeafMastery[]
  examDate?: string | null
  days?: number
}): Promise<MaxExamPack> {
  const countdown = examCountdown(opts.examDate)
  const isSprint =
    countdown.kind === 'future' && countdown.daysLeft <= MAX_SPRINT_WINDOW_DAYS
  const daysLeft = countdown.kind === 'future' ? countdown.daysLeft : null
  const dayCount = opts.days ?? (isSprint ? 14 : 7)

  const weakTopics = topicTargetsFromMasteries(opts.masteries, 6)
  const subjectLabel =
    getSyllabusSubjectName(opts.subjectCode) ?? opts.subjectCode

  const drills: Recommendation[] =
    weakTopics.length > 0
      ? await fetchTopicRecommendations(
          opts.supabase,
          weakTopics,
          Math.max(dayCount + 3, 8)
        )
      : []

  if (drills.length < 3) {
    const generic = await fetchGenericRecommendations(
      opts.supabase,
      opts.subjectCode,
      subjectLabel,
      8
    )
    const seen = new Set(drills.map((d) => `${d.paperCode}|${d.questionNumber}`))
    for (const g of generic) {
      const key = `${g.paperCode}|${g.questionNumber}`
      if (seen.has(key)) continue
      drills.push(g)
      seen.add(key)
      if (drills.length >= dayCount + 3) break
    }
  }

  const hub = paperHubHref(opts.subjectCode)
  const timedPapers = [
    { label: `${opts.subjectCode} timed paper 1`, href: hub, minutes: 75 },
    { label: `${opts.subjectCode} timed paper 2`, href: hub, minutes: 90 },
    { label: `${opts.subjectCode} timed paper 3`, href: hub, minutes: 90 },
  ]

  const days: MaxExamPackDay[] = []
  let drillCursor = 0

  for (let i = 0; i < dayCount; i++) {
    const dayNum = i + 1
    // Sprint: days 3, 7, 11 = timed papers; last day = review; else drills.
    // Normal week: day 7 = light timed block; else drills.
    const isTimedSprintDay = isSprint && (dayNum === 3 || dayNum === 7 || dayNum === 11)
    const isReviewDay = isSprint && dayNum === dayCount
    const isTimedNormal =
      !isSprint && dayNum === dayCount && drills.length > 0

    if (isTimedSprintDay || isTimedNormal) {
      const paperIdx = isSprint
        ? dayNum === 3
          ? 0
          : dayNum === 7
            ? 1
            : 2
        : 0
      const paper = timedPapers[paperIdx] ?? timedPapers[0]
      days.push({
        day: dayNum,
        focus: `Timed past paper (${paper.minutes} min) — mark on MarkScheme after`,
        kind: 'timed_paper',
        drills: [],
        paperHref: paper.href,
        minutes: paper.minutes,
      })
      continue
    }

    if (isReviewDay) {
      days.push({
        day: dayNum,
        focus: 'Review full-marks models + weakest topic rewrite',
        kind: 'review',
        drills: drills.slice(0, 2),
      })
      continue
    }

    const topic = weakTopics[i % Math.max(weakTopics.length, 1)]
    const dayDrills = drills.slice(drillCursor, drillCursor + 2)
    drillCursor += 2
    const fallback =
      dayDrills.length > 0 ? dayDrills : drills.slice(0, 2)

    days.push({
      day: dayNum,
      focus: topic
        ? `Drill: ${topic.name}`
        : 'Mixed past-paper practice',
      kind: 'drill',
      drills: fallback,
    })
  }

  return {
    subjectCode: opts.subjectCode,
    title: isSprint ? 'Max Sprint Pack' : "This week's Max pack",
    weekLabel: isoWeekLabel(),
    isSprint,
    daysLeft,
    weakTopics,
    days,
    timedPapers: isSprint ? timedPapers : timedPapers.slice(0, 1),
  }
}
