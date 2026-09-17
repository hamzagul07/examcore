import 'server-only'

/**
 * Everything the roadmap knows about one subject's syllabus leaves, gathered
 * in one place so the scorer (lib/plan/priority.ts) never touches a table.
 *
 * Each signal has one honest source and is absent when the source has
 * nothing: frequency from the papers MarkScheme has indexed (per component
 * when the student chose one), mastery from the student's own marked work,
 * error tags from the marker's classification keys (never its prose),
 * review dates from the two spaced-review tables, and the syllabus order as
 * a soft prerequisite hint. No field here is ever a prediction, and no
 * question or feedback text leaves this module — the privacy test pins it.
 *
 * Destinations say where each leaf can go: a lesson, a short banked question
 * (a diagnostic), a full banked question. The engine uses them to pick task
 * types it can actually hydrate; the service hydrates them later.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { calculateParentMastery, flattenLeafMasteries, type AttemptLite } from '@/lib/mastery'
import { getAttemptSubjectCode, type AttemptWithPaper } from '@/lib/syllabi/attempts'
import { getSyllabusTree, hasSyllabusTree, type SyllabusTreeGroup } from '@/lib/syllabi'
import { ERROR_LABELS } from '@/lib/error-classifications'
import { makeTopicLessonResolver } from '@/lib/courses/topic-lesson'
import { timedPaperSlots } from '@/lib/max/paper-practice-links'
import { frequencyFor, paperFrequency } from '@/lib/plan/high-yield-rank'
import { componentDigit, paperMatchesComponent } from '@/lib/plan/paper-match'
import type { TopicSignals } from '@/lib/plan/roadmap-types'

type Admin = SupabaseClient

export type TopicDestinations = { lesson: string[]; shortQuestion: string[]; question: string[] }

export type SubjectSignals = {
  signals: TopicSignals[]
  destinations: TopicDestinations
  paperMinutes?: number
}

/** A banked question short enough to be a diagnostic. */
export const SHORT_QUESTION_MAX_MARKS = 4
/** The range a plan's marked question comes from — long enough to mean something, short enough for a block. */
export const QUESTION_MIN_MARKS = 2
export const QUESTION_MAX_MARKS = 12
/** Error tags per leaf the scorer sees; the report shows the top one. */
const ERROR_TAGS_LIMIT = 2
/** Later leaves under the same parent listed as "comes first" hints, at most. */
const PREREQUISITE_OF_LIMIT = 3
const SCAN_PAGE = 1000
/** Tag frequency moves when papers are ingested, which is weekly at most. */
const SCAN_TTL_MS = 6 * 60 * 60 * 1000

type SchemeRow = {
  paper_code: string | null
  paper_session: string | null
  syllabus_tags: string[] | null
  total_marks: number | null
}

const scanCache = new Map<string, { at: number; rows: SchemeRow[] }>()
const frequencyCache = new Map<string, { at: number; freq: ReturnType<typeof paperFrequency> }>()

/**
 * Every tagged mark_schemes row for a subject, paged like the high-yield
 * scan and cached for six hours. One scan feeds both the frequency table
 * and the destinations, so a four-subject build costs four scans at most.
 */
async function scanSchemeRows(admin: Admin, subjectCode: string): Promise<SchemeRow[]> {
  const cached = scanCache.get(subjectCode)
  if (cached && Date.now() - cached.at < SCAN_TTL_MS) return cached.rows
  const rows: SchemeRow[] = []
  for (let from = 0; ; from += SCAN_PAGE) {
    const { data, error } = await admin
      .from('mark_schemes')
      .select('paper_code, paper_session, syllabus_tags, total_marks')
      .like('paper_code', `${subjectCode}/%`)
      .not('syllabus_tags', 'is', null)
      .range(from, from + SCAN_PAGE - 1)
    if (error || !data?.length) break
    rows.push(...(data as SchemeRow[]))
    if (data.length < SCAN_PAGE) break
  }
  scanCache.set(subjectCode, { at: Date.now(), rows })
  return rows
}

async function frequencyTable(admin: Admin, subjectCode: string, digit: string | null, nameOf: (code: string) => string | undefined) {
  const key = `${subjectCode}|${digit ?? ''}`
  const cached = frequencyCache.get(key)
  if (cached && Date.now() - cached.at < SCAN_TTL_MS) return cached.freq
  const rows = await scanSchemeRows(admin, subjectCode)
  const freq = paperFrequency(rows, nameOf, { componentDigit: digit ?? undefined })
  frequencyCache.set(key, { at: Date.now(), freq })
  return freq
}

/** Test hook: forget every cached scan. */
export function clearSignalCaches(): void {
  scanCache.clear()
  frequencyCache.clear()
}

/**
 * A "real" parent groups several leaves under its own name. The 9709 tree
 * makes each leaf its own parent, and trees without parents get stubs named
 * after the code; neither says anything about order, so neither yields a
 * prerequisite hint.
 */
function isRealParent(group: SyllabusTreeGroup): boolean {
  const { parent, leaves } = group
  if (!parent.name || parent.name === parent.code) return false
  if (leaves.length === 1 && leaves[0]!.code === parent.code) return false
  return leaves.length > 1
}

type ReviewRow = { topic_code: string; due_at: string }

async function reviewDueByTopic(admin: Admin, userId: string, subjectCode: string): Promise<Map<string, string>> {
  const due = new Map<string, string>()
  const take = (rows: ReviewRow[] | null | undefined) => {
    for (const r of rows ?? []) {
      if (!r.topic_code || !r.due_at) continue
      const current = due.get(r.topic_code)
      if (!current || r.due_at < current) due.set(r.topic_code, r.due_at)
    }
  }
  const [sched, recall] = await Promise.all([
    admin.from('review_schedule').select('topic_code, due_at').eq('user_id', userId).eq('subject_code', subjectCode),
    admin.from('lesson_recall').select('topic_code, due_at').eq('user_id', userId).eq('subject_code', subjectCode),
  ])
  take(sched.data as ReviewRow[] | null)
  take(recall.data as ReviewRow[] | null)
  return due
}

function shortestPaper(code: string): number | undefined {
  const slots = timedPaperSlots(code)
  if (slots.length === 0) return undefined
  return Math.min(...slots.map((s) => s.minutes))
}

/**
 * Signals and destinations for one subject. Attempts are passed in (the
 * caller loads them once for every subject on the plan); everything else is
 * read here.
 */
export async function gatherSubjectSignals(
  admin: Admin,
  userId: string,
  opts: { code: string; component?: string; nearestExamDate?: string; attempts: AttemptWithPaper[] }
): Promise<SubjectSignals> {
  const { code } = opts
  const paperMinutes = shortestPaper(code)
  const tree = hasSyllabusTree(code) ? getSyllabusTree(code) : null
  if (!tree?.length) return { signals: [], destinations: { lesson: [], shortQuestion: [], question: [] }, paperMinutes }

  const leafName = new Map<string, string>()
  for (const g of tree) for (const l of g.leaves) leafName.set(l.code, l.name)
  const nameOf = (c: string) => leafName.get(c)

  const digit = componentDigit(opts.component)
  const [freq, rows, dueByTopic] = await Promise.all([
    frequencyTable(admin, code, digit, nameOf),
    scanSchemeRows(admin, code),
    reviewDueByTopic(admin, userId, code),
  ])

  // The student's own work on this subject: mastery per leaf, and the
  // marker's classification keys per leaf. Never the marker's sentences.
  const own = opts.attempts.filter((a) => getAttemptSubjectCode(a) === code)
  const masteryByCode = new Map<string, { percentage: number; attempts: number }>()
  if (own.length > 0) {
    for (const m of flattenLeafMasteries(calculateParentMastery(own as unknown as AttemptLite[], code))) {
      if (m.attemptsCount > 0) masteryByCode.set(m.code, { percentage: Math.round(m.percentage), attempts: m.attemptsCount })
    }
  }
  const lastAtByCode = new Map<string, string>()
  const errorCounts = new Map<string, Map<string, number>>()
  for (const a of own) {
    for (const tag of new Set(a.syllabus_tags ?? [])) {
      if (!leafName.has(tag)) continue
      const prev = lastAtByCode.get(tag)
      if (!prev || a.created_at > prev) lastAtByCode.set(tag, a.created_at)
      for (const e of a.error_classifications ?? []) {
        const key = e?.classification
        if (!key || key === 'no_error' || !(key in ERROR_LABELS)) continue
        let counts = errorCounts.get(tag)
        if (!counts) {
          counts = new Map()
          errorCounts.set(tag, counts)
        }
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
    }
  }

  // Destinations from the same scan: a leaf with any banked question of the
  // right length. Tags outside the tree (parents, strays) are ignored.
  const shortQuestion = new Set<string>()
  const question = new Set<string>()
  for (const r of rows) {
    const marks = r.total_marks
    if (typeof marks !== 'number' || marks < 1 || marks > QUESTION_MAX_MARKS) continue
    for (const tag of new Set(r.syllabus_tags ?? [])) {
      if (!leafName.has(tag)) continue
      if (marks <= SHORT_QUESTION_MAX_MARKS) shortQuestion.add(tag)
      if (marks >= QUESTION_MIN_MARKS) question.add(tag)
    }
  }
  const resolveLesson = makeTopicLessonResolver(code)
  const lesson: string[] = []

  const signals: TopicSignals[] = []
  let order = 0
  for (const group of tree) {
    const real = isRealParent(group)
    group.leaves.forEach((leaf, i) => {
      const mastery = masteryByCode.get(leaf.code)
      const lastAt = lastAtByCode.get(leaf.code)
      const errors = errorCounts.get(leaf.code)
      const errorTags = errors
        ? [...errors.entries()].sort((a, b) => b[1] - a[1]).slice(0, ERROR_TAGS_LIMIT).map(([k]) => k)
        : undefined
      const prerequisiteOf = real ? group.leaves.slice(i + 1, i + 1 + PREREQUISITE_OF_LIMIT).map((l) => l.code) : []
      const frequency = frequencyFor(freq, leaf.code)
      const signal: TopicSignals = {
        code: leaf.code,
        name: leaf.name,
        parentCode: real ? group.parent.code : undefined,
        parentName: real ? group.parent.name : undefined,
        paper: leaf.paper || undefined,
        order,
        coreWeight: 1,
        prerequisiteOf,
        onNearestPaper: paperMatchesComponent(leaf.paper, opts.component) === true,
      }
      if (frequency) signal.frequency = frequency
      if (mastery) signal.mastery = { ...mastery, lastAt }
      if (errorTags?.length) signal.errorTags = errorTags
      const due = dueByTopic.get(leaf.code)
      if (due) signal.reviewDueAt = due
      signals.push(signal)
      if (resolveLesson(leaf.code)) lesson.push(leaf.code)
      order += 1
    })
  }

  return {
    signals,
    destinations: { lesson, shortQuestion: [...shortQuestion], question: [...question] },
    paperMinutes,
  }
}
