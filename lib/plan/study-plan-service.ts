import 'server-only'

/**
 * Everything around the pure plan engine that touches data: which topics a
 * subject's plan should rotate through, turning each block into a link to a
 * real question, and the one row per student in `study_plans`.
 *
 * The topic sources are the two the product already trusts. High-yield comes
 * from `mark_schemes.syllabus_tags` — the papers we hold, counted per paper
 * (lib/plan/high-yield-rank.ts). Weak comes from the student's own marked work
 * through the same mastery → recommendation path the Progress page uses. A
 * subject with neither (an IB subject with no syllabus tree, a new account)
 * still gets a plan; its drills open the practice desk instead of a banked
 * question.
 *
 * Hydration never invents a question. A drill points at a mark_schemes row
 * that exists for that subject AND that topic — the existing recommendation
 * lookup matches on tag alone, and "1.5" means different things in 9709 and
 * 9702 — or, when nothing is tagged yet, at the topic-question flow that
 * generates one.
 *
 * The roadmap (docs/EXAM_ROADMAP.md) grew this module rather than replacing
 * it. A v3 build gathers per-leaf signals (lib/plan/signals.ts), hands them
 * to buildRoadmap(), hydrates by TASK TYPE (a diagnostic opens a lesson's
 * quick check, a recall step its flashcards, a timed set a banked question)
 * and stores task state, topic pools, an undo snapshot and a materialised
 * today summary beside the plan. Every v2 reader keeps working: loadStudyPlan,
 * loadPlanEvidence and buildAndSaveStudyPlan are unchanged in signature, and
 * a v2 row reads back with an empty task state and revision 1.
 *
 * Writes after the build go through mutateRoadmap(): read the row, apply a
 * pure change, write it back only if nobody else wrote in between
 * (updated_at is the lock), record the event once the write has landed.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildRoadmap,
  validateRoadmap,
  buildStudyPlan,
  type BuildRoadmapInput,
  type PlanBlock,
  type PlanDay,
  type PlanSubjectInput,
  type PlanTopic,
  type Preparedness,
  type RoadmapSubjectInput,
  type StudyPlan,
  type WeekAvailability,
} from '@/lib/plan/build-study-plan'
import { rankTagsByPaper, type TaggedSchemeRow } from '@/lib/plan/high-yield-rank'
import {
  carryOverDone,
  todayInZone,
  type DoneDays,
  type HydratedBlock,
  type HydratedDay,
  type HydratedPlan,
} from '@/lib/plan/plan-view'
import {
  carryOverTaskState,
  dayCompleteFromTasks,
  normaliseRoadmap,
  type RoadmapDay,
  type RoadmapPlan,
  type RoadmapTask,
} from '@/lib/plan/roadmap-view'
import { rolloverDay, todaySummaryFor, undoSnapshotFor } from '@/lib/plan/task-actions'
import { minuteOfDayInZone } from '@/lib/plan/availability'
import { normalisePaperLabel } from '@/lib/plan/paper-match'
import { LEGACY_PREPAREDNESS_TO_MODE, MODE_TO_LEGACY_PREPAREDNESS } from '@/lib/plan/modes'
import { gatherSubjectSignals, QUESTION_MAX_MARKS, QUESTION_MIN_MARKS, SHORT_QUESTION_MAX_MARKS } from '@/lib/plan/signals'
import { recordRoadmapEvents, type RoadmapEventInput } from '@/lib/plan/events'
import type {
  DayMutationResponse,
  FeasibilityReport,
  FeasibilityState,
  ReplanDiff,
  RoadmapAvailability,
  RoadmapBuildRequest,
  RoadmapMode,
  RoadmapTodaySummary,
  TaskState,
  TimeWindow,
  TopicPriority,
  UndoSnapshot,
} from '@/lib/plan/roadmap-types'
import { calculateParentMastery, flattenLeafMasteries, type AttemptLite } from '@/lib/mastery'
import { topicTargetsFromMasteries } from '@/lib/insights/recommendations'
import { getAttemptSubjectCode, type AttemptWithPaper } from '@/lib/syllabi/attempts'
import { getSyllabusByCode, getSyllabusSubjectName, getSyllabusTopicByCode, hasSyllabusTree } from '@/lib/syllabi'
import type { SyllabusCode } from '@/lib/syllabus'
import { getSubjectByCode } from '@/lib/profile-options'
import { isIbSubjectCode } from '@/lib/ib/marking-config'
import { timedPaperSlots } from '@/lib/max/paper-practice-links'
import { pastPaperMarkHref } from '@/lib/marking/past-paper-mark-href'
import { normalizePaperSession } from '@/lib/marking/normalize-paper-session'
import { getCourseLesson } from '@/lib/courses'
import { getIbCourseLessons } from '@/lib/courses/ib'
import { topicToLessonSlug } from '@/lib/courses/slug'
import type { CourseLesson } from '@/lib/courses/types'

/** Where /mark sends the student back to after a plan drill. */
export const PLAN_RETURN_PATH = '/dashboard/plan'
/** The engine version a roadmap build stores in algorithm_version. */
export const ROADMAP_ALGORITHM_VERSION = 3

const HIGH_YIELD_LIMIT = 8
const WEAK_LIMIT = 5
/** Above this a leaf is not weak, whatever the recommendation list says. */
const WEAK_MAX_PCT = 65
/** Different questions for consecutive drills on the same topic. */
const CANDIDATES_PER_TOPIC = 6
/** A timed set rotates through this many banked questions. */
const TIMED_SET_CANDIDATES = 3
const SCAN_PAGE = 1000
/** Tag frequency moves when papers are ingested, which is weekly at most. */
const HIGH_YIELD_TTL_MS = 6 * 60 * 60 * 1000
/** A preview is retried on every wizard keystroke; the signals behind it do not change that fast. */
const PREVIEW_MEMO_TTL_MS = 60 * 1000
const ATTEMPTS_LIMIT = 300

type Admin = SupabaseClient

// --- subjects ------------------------------------------------------------------

export function subjectLabelFor(code: string): string {
  return getSubjectByCode(code)?.label ?? getSyllabusSubjectName(code) ?? code
}

/** A code the plan can do something with: catalogued, tagged, or an IB profile. */
export function isKnownPlanSubject(code: string): boolean {
  return Boolean(getSubjectByCode(code)) || hasSyllabusTree(code) || isIbSubjectCode(code)
}

const highYieldCache = new Map<string, { at: number; topics: PlanTopic[] }>()

/** Top leaf topics by the number of papers they appear in. Cached per subject. */
export async function fetchHighYieldTopics(
  admin: Admin,
  subjectCode: string,
  limit = HIGH_YIELD_LIMIT
): Promise<PlanTopic[]> {
  if (!hasSyllabusTree(subjectCode)) return []
  const cached = highYieldCache.get(subjectCode)
  if (cached && Date.now() - cached.at < HIGH_YIELD_TTL_MS) return cached.topics.slice(0, limit)

  const rows: TaggedSchemeRow[] = []
  for (let from = 0; ; from += SCAN_PAGE) {
    const { data, error } = await admin
      .from('mark_schemes')
      .select('paper_code, paper_session, syllabus_tags')
      .like('paper_code', `${subjectCode}/%`)
      .not('syllabus_tags', 'is', null)
      .range(from, from + SCAN_PAGE - 1)
    if (error || !data?.length) break
    rows.push(...(data as TaggedSchemeRow[]))
    if (data.length < SCAN_PAGE) break
  }

  const topics = rankTagsByPaper(
    rows,
    (code) => getSyllabusTopicByCode(subjectCode, code as SyllabusCode)?.name,
    HIGH_YIELD_LIMIT
  )
  highYieldCache.set(subjectCode, { at: Date.now(), topics })
  return topics.slice(0, limit)
}

/** The student's confirmed weak leaves for one subject, weakest first. */
function weakTopicsFor(attempts: AttemptWithPaper[], subjectCode: string): PlanTopic[] {
  if (!hasSyllabusTree(subjectCode)) return []
  const filtered = attempts.filter(
    (a) => getAttemptSubjectCode(a) === subjectCode
  ) as unknown as AttemptLite[]
  if (filtered.length === 0) return []
  const masteries = flattenLeafMasteries(calculateParentMastery(filtered, subjectCode))
  const byCode = new Map(masteries.map((m) => [m.code, m]))
  return (
    topicTargetsFromMasteries(masteries, WEAK_LIMIT)
      // The recommendation list also carries under-sampled leaves the student
      // did fine on ("confirm it"). A plan block that says "you lost marks
      // here" has to mean it — the first real dry run offered a 100% topic.
      .filter((t) => (byCode.get(t.code)?.percentage ?? 0) < WEAK_MAX_PCT)
      .map((t) => ({
        code: t.code,
        name: t.name,
        source: 'weak' as const,
        weight: Math.round(byCode.get(t.code)?.percentage ?? 0),
      }))
  )
}

/**
 * The syllabus leaves in order — the rotation when there is no frequency
 * data. Every IB subject has a tree (9–43 leaves); no IB mark scheme is
 * tagged, so without this an IB plan would say "a question" all the way.
 */
function syllabusTopicsFor(subjectCode: string): PlanTopic[] {
  return (getSyllabusByCode(subjectCode) ?? []).map((t) => ({
    code: t.code,
    name: t.name,
    source: 'syllabus' as const,
    weight: 0,
  }))
}

/** The student's recent marked work, newest first, once per build. */
async function fetchAttempts(admin: Admin, userId: string): Promise<AttemptWithPaper[]> {
  const { data } = await admin
    .from('attempts')
    .select(
      `
      id, marks_earned, total_marks, source_type, question_text, created_at,
      syllabus_tags, time_spent_seconds, error_classifications,
      mark_schemes ( question_number, paper_code, paper_session )
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(ATTEMPTS_LIMIT)
  return (data ?? []) as unknown as AttemptWithPaper[]
}

async function planSubjectFrom(
  admin: Admin,
  attempts: AttemptWithPaper[],
  code: string,
  examDate: string | undefined
): Promise<PlanSubjectInput> {
  return {
    code,
    label: subjectLabelFor(code),
    highYield: await fetchHighYieldTopics(admin, code),
    weak: weakTopicsFor(attempts, code),
    syllabus: syllabusTopicsFor(code),
    hasTimedPaper: timedPaperSlots(code).length > 0,
    paperMinutes: shortestPaper(code),
    examDate,
  }
}

/** Topic lists and paper availability for each requested subject. */
export async function resolvePlanSubjects(
  admin: Admin,
  userId: string,
  codes: string[],
  examDates: Record<string, string> = {}
): Promise<PlanSubjectInput[]> {
  const attempts = await fetchAttempts(admin, userId)
  return Promise.all(codes.map((code) => planSubjectFrom(admin, attempts, code, examDates[code])))
}

function shortestPaper(code: string): number | undefined {
  const slots = timedPaperSlots(code)
  if (slots.length === 0) return undefined
  return Math.min(...slots.map((s) => s.minutes))
}

// --- roadmap subjects ----------------------------------------------------------------

/** The request a v3 build needs, once the route has validated it. */
export type RoadmapServiceRequest = RoadmapBuildRequest & {
  startDate: string
  availabilityDetail: RoadmapAvailability
  timeZone: string
  /**
   * Minute of day in the plan's zone when startDate is today, so day 1 is
   * laid from now rather than from the first window (a plan built at 20:30
   * must not schedule 16:00). Absent when the plan starts tomorrow.
   */
  startMinute?: number
}

/** Board and qualification come from the profile; the plan's exams carry them so the screen never has to look them up. */
async function profileBoard(admin: Admin, userId: string): Promise<{ board: string; qualification: string }> {
  const { data } = await admin.from('user_profiles').select('board, level').eq('id', userId).maybeSingle()
  return {
    board: (data?.board as string | null) ?? 'Cambridge International',
    qualification: (data?.level as string | null) ?? 'A-Level',
  }
}

const subjectMemo = new Map<string, { at: number; subjects: Promise<RoadmapSubjectInput[]> }>()

function memoKey(userId: string, req: RoadmapServiceRequest): string {
  const codes = [...req.subjects].sort()
  const components = codes.map((c) => `${c}=${req.subjectComponents?.[c] ?? ''}`)
  const dates = codes.map((c) => `${c}@${req.subjectExamDates?.[c] ?? req.examDate}`)
  return `${userId}|${codes.join(',')}|${components.join(',')}|${dates.join(',')}`
}

/**
 * Subjects with their signals, for the engine. Memoised for a minute per
 * student, subject set and components, because the wizard previews on
 * every change and the attempts, trees and tags behind a preview do not
 * move that fast.
 */
async function resolveRoadmapSubjects(admin: Admin, userId: string, req: RoadmapServiceRequest, memo: boolean): Promise<RoadmapSubjectInput[]> {
  const key = memoKey(userId, req)
  if (memo) {
    const cached = subjectMemo.get(key)
    if (cached && Date.now() - cached.at < PREVIEW_MEMO_TTL_MS) return cached.subjects
  }
  const work = (async () => {
    const [attempts, profile] = await Promise.all([fetchAttempts(admin, userId), profileBoard(admin, userId)])
    return Promise.all(
      req.subjects.map(async (code): Promise<RoadmapSubjectInput> => {
        const examDate = req.subjectExamDates?.[code] ?? req.examDate
        const component = req.subjectComponents?.[code]
        const [base, gathered] = await Promise.all([
          planSubjectFrom(admin, attempts, code, examDate),
          gatherSubjectSignals(admin, userId, { code, component, nearestExamDate: examDate, attempts }),
        ])
        const ib = isIbSubjectCode(code)
        return {
          ...base,
          paperMinutes: gathered.paperMinutes ?? base.paperMinutes,
          signals: gathered.signals,
          destinations: gathered.destinations,
          selfRating: req.selfRatings?.[code],
          component,
          examTime: req.subjectExamTimes?.[code],
          board: ib ? 'IB' : profile.board,
          qualification: ib ? 'IB Diploma' : profile.qualification,
        }
      })
    )
  })()
  subjectMemo.set(key, { at: Date.now(), subjects: work })
  // A failed resolve must not be served for a minute.
  work.catch(() => subjectMemo.delete(key))
  return work
}

/** The engine's input, with the request's startMinute so day 1 is laid from now when the plan starts today. */
function roadmapInput(req: RoadmapServiceRequest, subjects: RoadmapSubjectInput[], previous: LoadedRoadmap | null): BuildRoadmapInput {
  return {
    startDate: req.startDate,
    ...(typeof req.startMinute === 'number' ? { startMinute: req.startMinute } : {}),
    examDate: req.examDate,
    mode: req.mode,
    availabilityDetail: req.availabilityDetail,
    subjects,
    blockedDates: req.blockedDates ?? [],
    timeZone: req.timeZone,
    selfRatings: req.selfRatings ?? {},
    durationScale: previous?.plan.durationScale,
    targetGrade: req.targetGrade ?? null,
    prioritySubject: req.prioritySubject ?? null,
  }
}

// --- hydration -------------------------------------------------------------------

type Candidate = { paperCode: string; paperSession: string; questionNumber: string }

type MarkRange = { minMarks: number; maxMarks: number }
const FULL_RANGE: MarkRange = { minMarks: QUESTION_MIN_MARKS, maxMarks: QUESTION_MAX_MARKS }
const SHORT_RANGE: MarkRange = { minMarks: 1, maxMarks: SHORT_QUESTION_MAX_MARKS }

async function candidatesFor(
  admin: Admin,
  subjectCode: string,
  topicCode: string,
  range: MarkRange = FULL_RANGE
): Promise<Candidate[]> {
  const { data } = await admin
    .from('mark_schemes')
    .select('paper_code, paper_session, question_number, total_marks')
    .like('paper_code', `${subjectCode}/%`)
    .contains('syllabus_tags', [topicCode])
    .gte('total_marks', range.minMarks)
    .lte('total_marks', range.maxMarks)
    .order('paper_session', { ascending: false })
    .limit(CANDIDATES_PER_TOPIC)
  const rows = (data ?? []) as Array<{
    paper_code: string | null
    paper_session: string | null
    question_number: string | null
  }>
  return rows
    .filter((r) => r.paper_code && r.paper_session && r.question_number)
    .map((r) => ({
      paperCode: r.paper_code!,
      paperSession: r.paper_session!,
      questionNumber: r.question_number!,
    }))
}

function sessionLabel(session: string): string {
  return normalizePaperSession(session).label || session
}

function poolKey(subjectCode: string, topicCode: string, range: MarkRange): string {
  return `${subjectCode}|${topicCode}|${range.minMarks}-${range.maxMarks}`
}

/** The lesson a topic has, and which of its sections exist, so a task never deep-links to a section that is not there. */
type LessonInfo = { href: string; name: string; quickCheck: boolean; flashcards: boolean; workedExamples: boolean }

function lessonInfoFrom(lesson: CourseLesson, href: string): LessonInfo {
  return {
    href,
    name: lesson.title,
    quickCheck: Boolean(lesson.quickCheck?.length),
    flashcards: Boolean(lesson.flashcards?.length),
    workedExamples: lesson.sections.some((s) => s.type === 'workedExample'),
  }
}

/** Per subject, topic code → lesson info. IB lessons load once per subject. */
function makeLessonInfoResolver(subjectCode: string): (topicCode: string) => LessonInfo | null {
  const cache = new Map<string, LessonInfo | null>()
  if (isIbSubjectCode(subjectCode)) {
    const routeSlug = subjectCode.replace(/^ib-/, '')
    let byTopic: Map<string, CourseLesson> | null = null
    return (topicCode) => {
      if (!byTopic) byTopic = new Map(getIbCourseLessons(routeSlug).map((l) => [l.topicCode, l]))
      const lesson = byTopic.get(topicCode)
      return lesson ? lessonInfoFrom(lesson, `/ib/courses/${routeSlug}/${lesson.slug}`) : null
    }
  }
  return (topicCode) => {
    if (cache.has(topicCode)) return cache.get(topicCode)!
    const topic = getSyllabusTopicByCode(subjectCode, topicCode as SyllabusCode)
    let info: LessonInfo | null = null
    if (topic) {
      const slug = topicToLessonSlug(topic.code, topic.name)
      const lesson = getCourseLesson(subjectCode, slug)
      if (lesson) info = lessonInfoFrom(lesson, `/courses/${subjectCode}/${slug}`)
    }
    cache.set(topicCode, info)
    return info
  }
}

/**
 * Every in-app destination carries where to come back to and which task it
 * was, so the plan page can show the check-in on return. External links
 * (IB papers on ibo.org) are left alone.
 */
function planHref(base: string, taskId: string | undefined, hash?: string): string {
  if (!base.startsWith('/')) return base
  const hashAt = base.indexOf('#')
  const existingHash = hashAt >= 0 ? base.slice(hashAt + 1) : ''
  const noHash = hashAt >= 0 ? base.slice(0, hashAt) : base
  const qAt = noHash.indexOf('?')
  const path = qAt >= 0 ? noHash.slice(0, qAt) : noHash
  const params = new URLSearchParams(qAt >= 0 ? noHash.slice(qAt + 1) : '')
  if (!params.has('return')) params.set('return', PLAN_RETURN_PATH)
  if (taskId) params.set('task', taskId)
  const finalHash = hash ?? existingHash
  return `${path}?${params.toString()}${finalHash ? `#${finalHash}` : ''}`
}

const LESSON_ANCHOR = {
  quickCheck: 'quick-check',
  flashcards: 'flashcards',
  workedExamples: 'worked-examples',
  fullNotes: 'full-notes',
} as const

const REVIEW_DESTINATION = { href: '/dashboard/review', resourceLabel: 'Your marked answers' } as const

type HydrationContext = {
  pools: Map<string, Candidate[]>
  cursors: Map<string, number>
  paperCursor: Map<string, number>
  lessons: Map<string, (topicCode: string) => LessonInfo | null>
}

/** The banked-question ranges a block may need, by its task type (v2 drills: the full range). */
function rangesFor(block: PlanBlock): MarkRange[] {
  if (!block.topic || !block.subjectCode || !hasSyllabusTree(block.subjectCode)) return []
  switch (block.taskType) {
    case 'diagnostic':
    case 'review':
      return [SHORT_RANGE]
    case 'question':
    case 'timed_set':
    case 'worked_example':
      return [FULL_RANGE]
    case undefined:
      return block.kind === 'drill' ? [FULL_RANGE] : []
    default:
      return []
  }
}

async function prepareHydration(admin: Admin, blocks: PlanBlock[]): Promise<HydrationContext> {
  const keys = new Map<string, { subject: string; topic: string; range: MarkRange }>()
  const subjects = new Set<string>()
  for (const b of blocks) {
    if (b.subjectCode) subjects.add(b.subjectCode)
    for (const range of rangesFor(b)) {
      keys.set(poolKey(b.subjectCode!, b.topic!.code, range), { subject: b.subjectCode!, topic: b.topic!.code, range })
    }
  }
  const pools = new Map<string, Candidate[]>()
  await Promise.all(
    [...keys.entries()].map(async ([key, k]) => {
      pools.set(key, await candidatesFor(admin, k.subject, k.topic, k.range))
    })
  )
  const lessons = new Map<string, (topicCode: string) => LessonInfo | null>()
  for (const code of subjects) lessons.set(code, makeLessonInfoResolver(code))
  return { pools, cursors: new Map(), paperCursor: new Map(), lessons }
}

function nextCandidate(ctx: HydrationContext, key: string): Candidate | null {
  const pool = ctx.pools.get(key) ?? []
  if (pool.length === 0) return null
  const i = ctx.cursors.get(key) ?? 0
  ctx.cursors.set(key, i + 1)
  return pool[i % pool.length]!
}

function topicQuestionFallback(block: PlanBlock, code: string, short: boolean): HydratedBlock {
  // Nothing banked for this topic: /mark generates one. For IB that is the
  // normal path — a cached, exam-style question per syllabus topic, marked
  // to the subject's criteria. For a Cambridge topic nobody has tagged yet
  // it is the fallback.
  const params = new URLSearchParams({ subject: code, return: PLAN_RETURN_PATH })
  if (block.topic) params.set('topic', block.topic.code)
  return {
    ...block,
    href: planHref(`/mark?${params.toString()}`, block.id),
    resourceLabel: block.topic
      ? isIbSubjectCode(code)
        ? `Exam-style question on this topic, marked with IB-style criteria for ${block.subjectLabel ?? subjectLabelFor(code)}`
        : short
          ? 'A short question on this topic'
          : 'A fresh question on this topic'
      : 'Practice desk',
  }
}

function bankedQuestion(block: PlanBlock, day: PlanDay, c: Candidate, suffix?: string): HydratedBlock {
  const topicName = block.topic?.name ?? ''
  return {
    ...block,
    href: planHref(
      pastPaperMarkHref({
        paperCode: c.paperCode,
        paperSession: c.paperSession,
        questionNumber: c.questionNumber,
        pattern: topicName || undefined,
        reason: topicName ? `Day ${day.day} of your plan — ${topicName}` : `Day ${day.day} of your plan`,
        returnTo: PLAN_RETURN_PATH,
      }),
      block.id
    ),
    resourceLabel: `Q${c.questionNumber} · ${c.paperCode} ${sessionLabel(c.paperSession)}${suffix ? ` · ${suffix}` : ''}`,
    question: { paperCode: c.paperCode, paperSession: c.paperSession, questionNumber: c.questionNumber },
  }
}

function lessonDestination(block: PlanBlock, info: LessonInfo, anchor: string, label: string): HydratedBlock {
  return { ...block, href: planHref(info.href, block.id, anchor), resourceLabel: `${label} · ${info.name}` }
}

function reviewDestination(block: PlanBlock): HydratedBlock {
  return { ...block, href: planHref(REVIEW_DESTINATION.href, block.id), resourceLabel: REVIEW_DESTINATION.resourceLabel }
}

function timedPaperDestination(ctx: HydrationContext, block: PlanBlock, code: string): HydratedBlock {
  const slots = timedPaperSlots(code)
  if (slots.length === 0) return block
  // Rotate through the papers that fit the block; if none fit, the
  // shortest, and the label already says "the first N minutes".
  const fitting = slots.filter((s) => s.minutes <= block.minutes)
  const pool = fitting.length > 0 ? fitting : [slots.reduce((a, b) => (b.minutes < a.minutes ? b : a))]
  const i = ctx.paperCursor.get(code) ?? 0
  ctx.paperCursor.set(code, i + 1)
  const slot = pool[i % pool.length]!
  return { ...block, href: planHref(slot.href, block.id), resourceLabel: `${slot.label} · ${slot.minutes} min` }
}

/** A v3 block, by task type. */
function hydrateTask(ctx: HydrationContext, block: PlanBlock, day: PlanDay): HydratedBlock {
  const type = block.taskType!
  if (type === 'buffer' || type === 'break' || type === 'rest') return block
  const code = block.subjectCode
  if (!code) return block
  if (type === 'timed_paper') return timedPaperDestination(ctx, block, code)
  if (type === 'mixed') {
    const params = new URLSearchParams({ subject: code, return: PLAN_RETURN_PATH })
    return { ...block, href: planHref(`/mark?${params.toString()}`, block.id), resourceLabel: 'Mixed practice desk' }
  }
  if (type === 'error_review') return reviewDestination(block)

  const topic = block.topic
  const lesson = topic ? ctx.lessons.get(code)?.(topic.code) ?? null : null
  const banked = (range: MarkRange) => (topic && hasSyllabusTree(code) ? nextCandidate(ctx, poolKey(code, topic.code, range)) : null)
  // "I need help" opens the lesson's worked examples (its notes when it has none), whatever the task itself opens.
  const helpHref = lesson ? planHref(lesson.href, block.id, lesson.workedExamples ? LESSON_ANCHOR.workedExamples : LESSON_ANCHOR.fullNotes) : undefined
  const withHelp = (b: HydratedBlock): HydratedBlock => (helpHref ? { ...b, helpHref } : b)

  switch (type) {
    case 'diagnostic': {
      if (lesson?.quickCheck) return withHelp(lessonDestination(block, lesson, LESSON_ANCHOR.quickCheck, 'Quick check'))
      const c = banked(SHORT_RANGE)
      if (c) return withHelp(bankedQuestion(block, day, c, 'short'))
      return withHelp(topicQuestionFallback(block, code, true))
    }
    case 'concept':
      if (lesson) return withHelp(lessonDestination(block, lesson, LESSON_ANCHOR.fullNotes, 'Full notes'))
      return reviewDestination(block)
    case 'worked_example': {
      if (lesson?.workedExamples) return withHelp(lessonDestination(block, lesson, LESSON_ANCHOR.workedExamples, 'Worked examples'))
      if (lesson) return withHelp(lessonDestination(block, lesson, LESSON_ANCHOR.fullNotes, 'Full notes'))
      const c = banked(FULL_RANGE)
      if (c) return bankedQuestion(block, day, c)
      return topicQuestionFallback(block, code, false)
    }
    case 'recall':
      if (lesson?.flashcards) return withHelp(lessonDestination(block, lesson, LESSON_ANCHOR.flashcards, 'Flashcards'))
      if (lesson?.quickCheck) return withHelp(lessonDestination(block, lesson, LESSON_ANCHOR.quickCheck, 'Quick check'))
      return reviewDestination(block)
    case 'question': {
      const c = banked(FULL_RANGE)
      if (c) return withHelp(bankedQuestion(block, day, c))
      return withHelp(topicQuestionFallback(block, code, false))
    }
    case 'timed_set': {
      // The first of up to three candidates; the pool cursor moves so a
      // second set on the same topic gets the next one.
      const key = topic && hasSyllabusTree(code) ? poolKey(code, topic.code, FULL_RANGE) : null
      const pool = key ? (ctx.pools.get(key) ?? []).slice(0, TIMED_SET_CANDIDATES) : []
      if (pool.length > 0 && key) {
        const i = ctx.cursors.get(key) ?? 0
        ctx.cursors.set(key, i + 1)
        return withHelp(bankedQuestion(block, day, pool[i % pool.length]!, 'timed'))
      }
      return withHelp(topicQuestionFallback(block, code, false))
    }
    case 'review': {
      const c = banked(SHORT_RANGE)
      if (c) return withHelp(bankedQuestion(block, day, c, 'short'))
      if (lesson?.quickCheck) return withHelp(lessonDestination(block, lesson, LESSON_ANCHOR.quickCheck, 'Quick check'))
      return reviewDestination(block)
    }
    default:
      return block
  }
}

/** A v2 block, by kind — the original hydration, untouched in behaviour. */
function hydrateLegacyBlock(ctx: HydrationContext, block: PlanBlock, day: PlanDay): HydratedBlock {
  if (block.kind === 'break' || block.kind === 'rest' || block.kind === 'buffer') return block
  if (block.kind === 'review') return { ...block, ...REVIEW_DESTINATION }
  const code = block.subjectCode
  if (!code) return block
  if (block.kind === 'timed_paper') return timedPaperDestination(ctx, block, code)

  if (block.topic && hasSyllabusTree(code)) {
    const c = nextCandidate(ctx, poolKey(code, block.topic.code, FULL_RANGE))
    if (c) return bankedQuestion(block, day, c)
  }
  return topicQuestionFallback(block, code, false)
}

function hydrateBlock(ctx: HydrationContext, block: PlanBlock, day: PlanDay): HydratedBlock {
  return block.taskType ? hydrateTask(ctx, block, day) : hydrateLegacyBlock(ctx, block, day)
}

/** Attach a real destination to every block that has one. */
export async function hydrateStudyPlan(admin: Admin, plan: StudyPlan): Promise<HydratedPlan> {
  const ctx = await prepareHydration(
    admin,
    plan.days.flatMap((d) => d.blocks)
  )
  const days: HydratedDay[] = plan.days.map((day) => ({
    ...day,
    blocks: day.blocks.map((b) => hydrateBlock(ctx, b, day)),
  }))
  return { ...plan, days, generatedAt: new Date().toISOString() }
}

/**
 * Re-hydrate only the listed tasks — the ones a replan, swap or rollover
 * created or changed. Everything else keeps the link it had, so a student
 * halfway through a question is not handed a different one.
 */
export async function hydrateTasks<P extends HydratedPlan | RoadmapPlan>(admin: Admin, plan: P, ids: string[]): Promise<P> {
  if (ids.length === 0) return plan
  const wanted = new Set(ids)
  const targets: PlanBlock[] = []
  for (const d of plan.days) for (const b of d.blocks) if (b.id && wanted.has(b.id)) targets.push(b)
  if (targets.length === 0) return plan
  const ctx = await prepareHydration(admin, targets)
  const days = plan.days.map((day) => {
    if (!day.blocks.some((b) => b.id && wanted.has(b.id))) return day
    return {
      ...day,
      blocks: day.blocks.map((b) => (b.id && wanted.has(b.id) ? hydrateBlock(ctx, stripDestination(b), day) : b)),
    }
  })
  return { ...plan, days } as P
}

/** A changed task forgets its old link before it is hydrated again. */
function stripDestination(block: HydratedBlock): PlanBlock {
  const rest: HydratedBlock = { ...block }
  delete rest.href
  delete rest.resourceLabel
  delete rest.question
  delete rest.helpHref
  return rest
}

// --- persistence -------------------------------------------------------------------

/** What the dashboard card and the v2 readers need. taskState and revision are present once the v3 columns exist. */
export type SavedPlan = { plan: HydratedPlan; done: DoneDays; taskState?: TaskState; revision?: number }

/** The study_plans row, every column, as PostgREST returns it. */
export type StudyPlanRow = {
  user_id: string
  exam_date: string
  preparedness: Preparedness
  minutes_per_day: number
  availability: WeekAvailability | number[]
  subjects: Array<{ code: string; label: string; examDate?: string }>
  plan: HydratedPlan
  done_days: DoneDays
  generated_at: string
  updated_at: string
  checkin_last_sent_at: string | null
  time_zone: string
  blocked_dates: string[]
  strategy: RoadmapMode | null
  algorithm_version: number | null
  revision: number
  feasibility_state: FeasibilityState | null
  input_snapshot: Record<string, unknown> | null
  task_state: TaskState
  pools: Record<string, TopicPriority[]> | null
  undo: UndoSnapshot | null
  today_summary: RoadmapTodaySummary | null
  last_rolled_date: string | null
  reminder_time: string | null
  quiet_hours: TimeWindow | null
  notify_backoff: number
  checkins_unopened: number
}

export async function loadStudyPlan(admin: Admin, userId: string): Promise<SavedPlan | null> {
  // The v3 columns first; a schema that predates the roadmap migration
  // still answers with the two the v2 readers need.
  const v3 = await admin.from('study_plans').select('plan, done_days, task_state, revision').eq('user_id', userId).maybeSingle()
  const { data } = v3.error ? await admin.from('study_plans').select('plan, done_days').eq('user_id', userId).maybeSingle() : v3
  if (!data?.plan) return null
  const row = data as { plan: HydratedPlan; done_days: DoneDays | null; task_state?: TaskState | null; revision?: number | null }
  return {
    plan: row.plan,
    done: (row.done_days ?? {}) as DoneDays,
    taskState: (row.task_state ?? {}) as TaskState,
    revision: typeof row.revision === 'number' ? row.revision : 1,
  }
}

/**
 * The student's marked work per subject, for the wizard's "current
 * position" step: the mean percentage across the subject's leaves,
 * weighted by attempts, and the attempt count. Only subjects with at least
 * one tagged attempt appear; the wizard trusts a figure at three or more.
 */
export async function measuredBySubject(admin: Admin, userId: string, codes: string[]): Promise<Record<string, { pct: number; attempts: number }>> {
  const attempts = await fetchAttempts(admin, userId)
  const out: Record<string, { pct: number; attempts: number }> = {}
  for (const code of codes) {
    if (!hasSyllabusTree(code)) continue
    const filtered = attempts.filter((a) => getAttemptSubjectCode(a) === code) as unknown as AttemptLite[]
    if (filtered.length === 0) continue
    const leaves = flattenLeafMasteries(calculateParentMastery(filtered, code)).filter((m) => m.attemptsCount > 0)
    const total = leaves.reduce((s, m) => s + m.attemptsCount, 0)
    if (total === 0) continue
    const pct = leaves.reduce((s, m) => s + m.percentage * m.attemptsCount, 0) / total
    out[code] = { pct: Math.round(pct), attempts: total }
  }
  return out
}

/** The papers a subject's syllabus leaves are labelled for, as the wizard's component choices ('Paper 1' …). */
export function subjectComponentsFor(code: string): string[] {
  const papers = new Set<string>()
  for (const leaf of getSyllabusByCode(code) ?? []) {
    for (const p of normalisePaperLabel(leaf.paper)) papers.add(p)
  }
  return [...papers].sort().map((p) => `Paper ${p.slice(1)}`)
}

/** A plan with everything the roadmap routes act on. A v2 row reads back with an empty task state and revision 1. */
export type LoadedRoadmap = {
  plan: HydratedPlan
  done: DoneDays
  taskState: TaskState
  revision: number
  pools: Record<string, TopicPriority[]>
  updatedAt: string
  generatedAt: string
  timeZone: string
  lastRolledDate: string | null
  undo: UndoSnapshot | null
  todaySummary: RoadmapTodaySummary | null
  checkinsUnopened: number
  /** When the last morning check-in went out; a plan read soon after one counts as opening it. */
  checkinLastSentAt: string | null
}

const ROADMAP_COLUMNS =
  'plan, done_days, task_state, revision, pools, updated_at, generated_at, time_zone, last_rolled_date, undo, today_summary, checkins_unopened, checkin_last_sent_at'

export async function loadRoadmap(admin: Admin, userId: string): Promise<LoadedRoadmap | null> {
  const { data, error } = await admin.from('study_plans').select(ROADMAP_COLUMNS).eq('user_id', userId).maybeSingle()
  if (error) throw new Error(`study_plans read failed: ${error.message}`)
  if (!data?.plan) return null
  const row = data as unknown as Pick<
    StudyPlanRow,
    | 'plan'
    | 'done_days'
    | 'task_state'
    | 'revision'
    | 'pools'
    | 'updated_at'
    | 'generated_at'
    | 'time_zone'
    | 'last_rolled_date'
    | 'undo'
    | 'today_summary'
    | 'checkins_unopened'
    | 'checkin_last_sent_at'
  >
  return {
    plan: row.plan,
    done: (row.done_days ?? {}) as DoneDays,
    taskState: (row.task_state ?? {}) as TaskState,
    revision: typeof row.revision === 'number' ? row.revision : 1,
    pools: row.pools ?? {},
    updatedAt: row.updated_at,
    generatedAt: row.generated_at,
    // The column is authoritative for the zone; the JSON copy is for the page.
    timeZone: row.time_zone || row.plan.timeZone || 'UTC',
    lastRolledDate: row.last_rolled_date ?? null,
    undo: row.undo ?? null,
    todaySummary: row.today_summary ?? null,
    checkinsUnopened: row.checkins_unopened ?? 0,
    checkinLastSentAt: row.checkin_last_sent_at ?? null,
  }
}

/**
 * The few columns GET /api/plan/today needs before it decides whether the
 * stored summary can answer on its own: the plan column is ~140 KB and was
 * loaded on every read (1.2 s warm on production) although only the clock
 * moves between writes. Null when the student has no plan.
 */
export type RoadmapLight = {
  userId: string
  timeZone: string
  revision: number
  generatedAt: string
  lastRolledDate: string | null
  todaySummary: RoadmapTodaySummary | null
  checkinsUnopened: number
  checkinLastSentAt: string | null
}

const ROADMAP_LIGHT_COLUMNS = 'user_id, time_zone, revision, generated_at, last_rolled_date, today_summary, checkins_unopened, checkin_last_sent_at'

export async function loadRoadmapLight(admin: Admin, userId: string): Promise<RoadmapLight | null> {
  const { data, error } = await admin.from('study_plans').select(ROADMAP_LIGHT_COLUMNS).eq('user_id', userId).maybeSingle()
  if (error) throw new Error(`study_plans read failed: ${error.message}`)
  if (!data) return null
  const row = data as unknown as Pick<
    StudyPlanRow,
    'user_id' | 'time_zone' | 'revision' | 'generated_at' | 'last_rolled_date' | 'today_summary' | 'checkins_unopened' | 'checkin_last_sent_at'
  >
  return {
    userId: row.user_id,
    timeZone: row.time_zone || 'UTC',
    revision: typeof row.revision === 'number' ? row.revision : 1,
    generatedAt: row.generated_at,
    lastRolledDate: row.last_rolled_date ?? null,
    todaySummary: row.today_summary ?? null,
    checkinsUnopened: row.checkins_unopened ?? 0,
    checkinLastSentAt: row.checkin_last_sent_at ?? null,
  }
}

/** A check-in sent within this long of a plan read counts as opened, whichever link the student took. */
const CHECKIN_OPEN_WINDOW_MS = 24 * 60 * 60 * 1000

/**
 * The backoff counter starts again when the student opens the plan from a
 * check-in (?src=checkin on any roadmap read) — or, since the email's task
 * rows land on the lesson and the marking desk rather than the plan page,
 * on any signed-in roadmap read within a day of a send. Returns true when
 * the row was reset, so the caller can record the click.
 */
export async function markCheckinOpened(
  admin: Admin,
  userId: string,
  loaded: Pick<LoadedRoadmap, 'checkinsUnopened' | 'checkinLastSentAt'>,
  opts: { explicit: boolean; now?: Date }
): Promise<boolean> {
  if (loaded.checkinsUnopened <= 0) return false
  const now = opts.now ?? new Date()
  const sentAt = loaded.checkinLastSentAt ? Date.parse(loaded.checkinLastSentAt) : Number.NaN
  const recent = Number.isFinite(sentAt) && now.getTime() - sentAt <= CHECKIN_OPEN_WINDOW_MS
  if (!opts.explicit && !recent) return false
  await admin.from('study_plans').update({ checkins_unopened: 0 }).eq('user_id', userId)
  loaded.checkinsUnopened = 0
  return true
}

export type BuildPlanRequest = {
  startDate: string
  examDate: string
  preparedness: Preparedness
  minutesPerDay: number
  availability: WeekAvailability
  subjectCodes: string[]
  /** IANA zone the client reported; 'UTC' when it could not. */
  timeZone: string
  /** ISO dates the student is away. */
  blockedDates: string[]
  /** A subject's own paper date when it differs from examDate. */
  subjectExamDates?: Record<string, string>
}

export type RoadmapEvidence = {
  /** The keys blockEvidenceKey() produces for everything marked since the plan was built. */
  keys: string[]
  /** 't:{subject}|{topic}' → the latest attempt's percentage, for re-branching a diagnostic. */
  topicResults: Record<string, number>
}

/**
 * What the student has actually marked since the plan was built, as the
 * keys blockEvidenceKey() produces — a banked question by paper/session/
 * number, a generated topic question by subject/topic — plus the latest
 * percentage per topic, which the rollover reads to decide whether a
 * diagnostic found a weak topic. The page and the dashboard card show a
 * block as done on this evidence, tick or no tick.
 */
export async function loadRoadmapEvidence(admin: Admin, userId: string, plan: Pick<HydratedPlan, 'generatedAt'>): Promise<RoadmapEvidence> {
  const since = plan.generatedAt || new Date(0).toISOString()
  const { data } = await admin
    .from('attempts')
    .select('created_at, syllabus_tags, source_type, question_text, marks_earned, total_marks, mark_schemes ( paper_code, paper_session, question_number )')
    .eq('user_id', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(500)
  const keys = new Set<string>()
  const topicResults: Record<string, number> = {}
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const ms = row.mark_schemes as
      | { paper_code: string | null; paper_session: string | null; question_number: string | null }
      | { paper_code: string | null; paper_session: string | null; question_number: string | null }[]
      | null
    const scheme = Array.isArray(ms) ? ms[0] : ms
    if (scheme?.paper_code && scheme.paper_session && scheme.question_number) {
      keys.add(`q:${scheme.paper_code}|${scheme.paper_session}|${scheme.question_number}`)
    }
    const tags = row.syllabus_tags as string[] | null
    if (tags?.length) {
      const subject = getAttemptSubjectCode(row as unknown as AttemptWithPaper)
      if (subject) {
        const total = Number(row.total_marks)
        const earned = Number(row.marks_earned)
        const pct = total > 0 && Number.isFinite(earned) ? Math.round((earned / total) * 100) : null
        for (const tag of tags) {
          const key = `t:${subject}|${tag}`
          keys.add(key)
          // Newest first, so the first percentage seen per topic is the latest.
          if (pct !== null && !(key in topicResults)) topicResults[key] = pct
        }
      }
    }
  }
  return { keys: [...keys], topicResults }
}

export async function loadPlanEvidence(admin: Admin, userId: string, plan: HydratedPlan): Promise<string[]> {
  return (await loadRoadmapEvidence(admin, userId, plan)).keys
}

/**
 * Build, hydrate and store — replacing any previous plan. Ticks carry over
 * by date, so adjusting a plan for a trip does not erase the week done.
 */
export async function buildAndSaveStudyPlan(
  admin: Admin,
  userId: string,
  req: BuildPlanRequest
): Promise<SavedPlan> {
  const [subjects, previous] = await Promise.all([
    resolvePlanSubjects(admin, userId, req.subjectCodes, req.subjectExamDates ?? {}),
    loadStudyPlan(admin, userId),
  ])
  const plan = buildStudyPlan({
    startDate: req.startDate,
    examDate: req.examDate,
    preparedness: req.preparedness,
    minutesPerDay: req.minutesPerDay,
    availability: req.availability,
    subjects,
    timeZone: req.timeZone,
    blockedDates: req.blockedDates,
  })
  const hydrated = await hydrateStudyPlan(admin, plan)
  const now = hydrated.generatedAt
  const done: DoneDays = previous ? carryOverDone(previous.plan, previous.done, hydrated) : {}

  const { error } = await admin.from('study_plans').upsert(
    {
      user_id: userId,
      // The last exam — a subject dated later than the form's date extends the plan.
      exam_date: hydrated.examDate,
      preparedness: req.preparedness,
      strategy: LEGACY_PREPAREDNESS_TO_MODE[req.preparedness],
      algorithm_version: hydrated.version,
      minutes_per_day: hydrated.minutesPerDay,
      availability: hydrated.availability,
      subjects: hydrated.subjects,
      time_zone: hydrated.timeZone,
      blocked_dates: hydrated.blockedDates,
      plan: hydrated,
      done_days: done,
      // A v2 rebuild over a v3 row must not leave v3 state behind.
      revision: 1,
      feasibility_state: null,
      input_snapshot: null,
      task_state: {},
      pools: null,
      undo: null,
      today_summary: null,
      last_rolled_date: null,
      generated_at: now,
      updated_at: now,
      checkin_last_sent_at: null,
    },
    { onConflict: 'user_id' }
  )
  if (error) throw new Error(`study_plans upsert failed: ${error.message}`)
  return { plan: hydrated, done }
}

export type SavedRoadmap = {
  plan: HydratedPlan
  done: DoneDays
  taskState: TaskState
  revision: number
  feasibility: FeasibilityReport | null
}

/**
 * Build a v3 plan, hydrate it by task type and store it with its pools,
 * task state and today summary. Ticks and task state carry over: task ids
 * are tuple-based, so a task that still exists after the rebuild keeps its
 * done / skipped / shortened entry.
 */
export async function buildAndSaveRoadmap(admin: Admin, userId: string, req: RoadmapServiceRequest): Promise<SavedRoadmap> {
  const [subjects, previous] = await Promise.all([resolveRoadmapSubjects(admin, userId, req, false), loadRoadmap(admin, userId)])
  // Strict: a plan that breaks an invariant (an overlap, a task after its paper) is a 500 here, never a stored row.
  const { plan, pools } = buildRoadmap(roadmapInput(req, subjects, previous), { strict: true })
  const hydrated = await hydrateStudyPlan(admin, plan)
  const now = hydrated.generatedAt
  const done: DoneDays = previous ? carryOverDone(previous.plan, previous.done, hydrated) : {}
  const normalised = normaliseRoadmap(hydrated)
  const taskState: TaskState = previous ? carryOverTaskState(previous.taskState, normalised) : {}
  const todayIso = todayInZone(req.timeZone)
  const todaySummary = todaySummaryFor(normalised, taskState, new Set<string>(), done, todayIso, req.startMinute ?? minuteOfDayInZone(req.timeZone))
  const feasibility = hydrated.feasibility ?? null
  const { preview: _preview, ...snapshot } = req

  const { error } = await admin.from('study_plans').upsert(
    {
      user_id: userId,
      exam_date: hydrated.examDate,
      preparedness: MODE_TO_LEGACY_PREPAREDNESS[req.mode],
      strategy: req.mode,
      algorithm_version: ROADMAP_ALGORITHM_VERSION,
      revision: 1,
      feasibility_state: feasibility?.state ?? null,
      input_snapshot: snapshot,
      minutes_per_day: hydrated.minutesPerDay,
      availability: hydrated.availability,
      subjects: hydrated.subjects,
      time_zone: hydrated.timeZone,
      blocked_dates: hydrated.blockedDates,
      plan: hydrated,
      done_days: done,
      task_state: taskState,
      pools,
      undo: null,
      today_summary: todaySummary,
      last_rolled_date: req.startDate,
      reminder_time: req.availabilityDetail.reminderTime,
      quiet_hours: req.availabilityDetail.quietHours,
      generated_at: now,
      updated_at: now,
      checkin_last_sent_at: null,
    },
    { onConflict: 'user_id' }
  )
  if (error) throw new Error(`study_plans upsert failed: ${error.message}`)
  return { plan: hydrated, done, taskState, revision: 1, feasibility }
}

/** The wizard's live feasibility: resolve, build, report — no hydration, no save, no pools to the client. */
export async function previewRoadmap(admin: Admin, userId: string, req: RoadmapServiceRequest): Promise<{ plan: StudyPlan; feasibility: FeasibilityReport | null }> {
  const [subjects, previous] = await Promise.all([resolveRoadmapSubjects(admin, userId, req, true), loadRoadmap(admin, userId)])
  const { plan } = buildRoadmap(roadmapInput(req, subjects, previous))
  // A preview is never stored, so an invalid one is logged rather than refused; the build itself is strict.
  const errors = validateRoadmap(plan)
  if (errors.length > 0) console.error('[plan] preview broke an invariant', { userId, errors: errors.slice(0, 5) })
  return { plan, feasibility: plan.feasibility ?? null }
}

/** Tick or untick one day. Null when there is no plan or no such day. */
export async function setPlanDayDone(
  admin: Admin,
  userId: string,
  day: number,
  done: boolean
): Promise<DoneDays | null> {
  const { data } = await admin
    .from('study_plans')
    .select('plan, done_days')
    .eq('user_id', userId)
    .maybeSingle()
  if (!data?.plan) return null
  const plan = data.plan as HydratedPlan
  if (!plan.days.some((d) => d.day === day)) return null

  const next: DoneDays = { ...((data.done_days as DoneDays | null) ?? {}) }
  if (done) next[String(day)] = true
  else delete next[String(day)]

  const { error } = await admin
    .from('study_plans')
    .update({ done_days: next, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (error) throw new Error(`study_plans update failed: ${error.message}`)
  return next
}

export async function deleteStudyPlan(admin: Admin, userId: string): Promise<void> {
  await admin.from('study_plans').delete().eq('user_id', userId)
}

// --- mutations --------------------------------------------------------------------

/** What a route knows about the moment it acts: the student's date and clock, and their marked work. */
export type RoadmapContext = {
  now: Date
  todayIso: string
  nowMinute: number
  evidence: Set<string>
  topicResults: Record<string, number>
}

/** A change to write back. `undo` undefined keeps the stored snapshot; null clears it. */
export type RoadmapWrite = {
  plan: HydratedPlan | RoadmapPlan
  taskState: TaskState
  done?: DoneDays
  /** Written only when an action changed them (a too_easy check-in raises a topic's mastery). */
  pools?: Record<string, TopicPriority[]>
  undo?: UndoSnapshot | null
  revision: number
  lastRolledDate?: string
  checkinsUnopened?: number
  events?: RoadmapEventInput[]
}

/** The client acted on a revision that is no longer current. */
export class RoadmapStaleError extends Error {
  constructor(public readonly revision: number) {
    super('stale')
  }
}

/** Two writers raced and the retry lost too. */
export class RoadmapConflictError extends Error {
  constructor() {
    super('conflict')
  }
}

export async function roadmapContext(admin: Admin, userId: string, loaded: LoadedRoadmap, now: Date, nowMinute?: number): Promise<RoadmapContext> {
  const evidence = await loadRoadmapEvidence(admin, userId, loaded.plan)
  return {
    now,
    todayIso: todayInZone(loaded.timeZone, now),
    nowMinute: typeof nowMinute === 'number' ? nowMinute : minuteOfDayInZone(loaded.timeZone, now),
    evidence: new Set(evidence.keys),
    topicResults: evidence.topicResults,
  }
}

/** The materialised summary for GET /api/plan/today, from a plan and its state. */
export function summaryFor(loaded: Pick<LoadedRoadmap, 'plan' | 'taskState' | 'done'>, ctx: RoadmapContext): RoadmapTodaySummary {
  return todaySummaryFor(normaliseRoadmap(loaded.plan), loaded.taskState, ctx.evidence, loaded.done, ctx.todayIso, ctx.nowMinute)
}

/** Write a change with updated_at as the lock. False when someone else wrote first. */
async function writeRoadmap(admin: Admin, userId: string, loaded: LoadedRoadmap, write: RoadmapWrite, ctx: RoadmapContext): Promise<string | null> {
  const updatedAt = ctx.now.toISOString()
  const done = write.done ?? loaded.done
  const patch: Record<string, unknown> = {
    plan: write.plan,
    task_state: write.taskState,
    done_days: done,
    revision: write.revision,
    today_summary: summaryFor({ plan: write.plan, taskState: write.taskState, done }, ctx),
    updated_at: updatedAt,
  }
  if (write.undo !== undefined) patch.undo = write.undo
  if (write.pools !== undefined) patch.pools = write.pools
  if (write.lastRolledDate !== undefined) patch.last_rolled_date = write.lastRolledDate
  if (write.checkinsUnopened !== undefined) patch.checkins_unopened = write.checkinsUnopened
  const { data, error } = await admin
    .from('study_plans')
    .update(patch)
    .eq('user_id', userId)
    .eq('updated_at', loaded.updatedAt)
    .select('user_id')
  if (error) throw new Error(`study_plans update failed: ${error.message}`)
  return data && data.length > 0 ? updatedAt : null
}

export type MutationResult<W extends RoadmapWrite> = {
  /** The row as read before the change. */
  before: LoadedRoadmap
  /** The row as it now stands (the same object as `before` when nothing was written). */
  after: LoadedRoadmap
  write: W | null
  ctx: RoadmapContext
}

/**
 * Read, change, write, record. The change function is pure over what it is
 * given and may return null for "nothing to do"; the write is conditional
 * on updated_at, retried once from a fresh read, and the events are
 * inserted only after it lands. Null when the student has no plan.
 */
export async function mutateRoadmap<W extends RoadmapWrite>(
  admin: Admin,
  userId: string,
  now: Date,
  change: (loaded: LoadedRoadmap, ctx: RoadmapContext) => Promise<W | null> | W | null,
  opts: { nowMinute?: number } = {}
): Promise<MutationResult<W> | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const loaded = await loadRoadmap(admin, userId)
    if (!loaded) return null
    const ctx = await roadmapContext(admin, userId, loaded, now, opts.nowMinute)
    const write = await change(loaded, ctx)
    if (!write) return { before: loaded, after: loaded, write: null, ctx }
    const wroteAt = await writeRoadmap(admin, userId, loaded, write, ctx)
    if (!wroteAt) continue
    if (write.events?.length) await recordRoadmapEvents(admin, userId, write.events)
    const after: LoadedRoadmap = {
      ...loaded,
      plan: write.plan,
      taskState: write.taskState,
      done: write.done ?? loaded.done,
      pools: write.pools ?? loaded.pools,
      revision: write.revision,
      undo: write.undo === undefined ? loaded.undo : write.undo,
      lastRolledDate: write.lastRolledDate ?? loaded.lastRolledDate,
      checkinsUnopened: write.checkinsUnopened ?? loaded.checkinsUnopened,
      todaySummary: summaryFor({ plan: write.plan, taskState: write.taskState, done: write.done ?? loaded.done }, ctx),
      updatedAt: wroteAt,
    }
    return { before: loaded, after, write, ctx }
  }
  throw new RoadmapConflictError()
}

// --- rollover ---------------------------------------------------------------------

function nextIsoDate(iso: string): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)
}

/** The next day with work on or after `from`, never in the past — a deferred task lands where it can still be done. */
function nextStudyDate(plan: Pick<RoadmapPlan, 'days'>, after: string, todayIso: string): string | null {
  const day = plan.days.find((d) => d.date > after && d.date >= todayIso && d.workMinutes > 0)
  return day?.date ?? null
}

export type RolloverWrite = RoadmapWrite & { diffs: ReplanDiff[] }

/**
 * The lazy rollover: for every date since the plan was last rolled, let the
 * engine settle what happened (an undone task defers once into the next
 * study day's time in hand, or returns to the pool; a marked diagnostic
 * re-branches its provisional steps). Runs on the first read after
 * midnight in the plan's zone, once per date, so it is idempotent by
 * construction. Null when there is nothing to roll.
 */
export async function rollForward(admin: Admin, loaded: LoadedRoadmap, ctx: RoadmapContext): Promise<RolloverWrite | null> {
  const from = loaded.lastRolledDate
  if (!from || from >= ctx.todayIso) return null
  let plan = normaliseRoadmap(loaded.plan)
  let taskState = loaded.taskState
  const needsHydration = new Set<string>()
  const diffs: ReplanDiff[] = []
  const events: RoadmapEventInput[] = []
  let undo: UndoSnapshot | undefined
  let pools = loaded.pools
  for (let date = from; date < ctx.todayIso; date = nextIsoDate(date)) {
    const toDate = nextStudyDate(plan, date, ctx.todayIso)
    if (!toDate) continue
    const before = { plan, taskState }
    const res = rolloverDay(plan, taskState, pools, { fromDate: date, toDate, evidence: ctx.evidence, topicResults: ctx.topicResults })
    if (!res || res.noop) continue
    pools = res.pools
    if (res.diff && res.diff.changes.length > 0) {
      // Both sides of the move go into the snapshot, so undo puts yesterday's tasks back and removes the copy.
      undo = undoSnapshotFor(before.plan, before.taskState, res.diff.date, res.diff.summary, [date, toDate])
      diffs.push(res.diff)
      events.push({
        eventType: 'roadmap_rollover',
        planGeneratedAt: loaded.generatedAt,
        revision: loaded.revision + 1,
        meta: { fromDate: date, toDate, changes: res.diff.changes.length },
      })
    }
    plan = res.plan
    taskState = res.taskState
    for (const id of res.needsHydration) needsHydration.add(id)
  }
  const hydrated = needsHydration.size > 0 ? await hydrateTasks(admin, plan, [...needsHydration]) : plan
  const changed = diffs.length > 0 || needsHydration.size > 0
  return {
    plan: hydrated,
    taskState,
    pools: pools !== loaded.pools ? pools : undefined,
    revision: changed ? loaded.revision + 1 : loaded.revision,
    lastRolledDate: ctx.todayIso,
    undo,
    events,
    diffs,
  }
}

/** Load the plan and settle any dates since it was last read. What GET /api/plan and /api/plan/today start with. */
export async function loadRoadmapRolled(admin: Admin, userId: string, now = new Date()): Promise<{ loaded: LoadedRoadmap; ctx: RoadmapContext } | null> {
  const result = await mutateRoadmap(admin, userId, now, (loaded, ctx) => rollForward(admin, loaded, ctx))
  if (!result) return null
  return { loaded: result.after, ctx: result.ctx }
}

// --- responses ---------------------------------------------------------------------

/** The day a task lives on, in the normalised plan. */
export function dayOfTask(plan: Pick<RoadmapPlan, 'days'>, taskId: string): RoadmapDay | null {
  return plan.days.find((d) => d.blocks.some((b) => b.id === taskId)) ?? null
}

export function taskById(plan: Pick<RoadmapPlan, 'days'>, taskId: string): RoadmapTask | null {
  for (const d of plan.days) for (const b of d.blocks) if (b.id === taskId) return b
  return null
}

/** One day back to the client, plus any other days the change touched. */
export function dayMutationResponse(
  loaded: LoadedRoadmap,
  date: string,
  diff: ReplanDiff | undefined,
  changedDates: string[] = []
): DayMutationResponse<RoadmapDay> | null {
  const plan = normaliseRoadmap(loaded.plan)
  const day = plan.days.find((d) => d.date === date)
  if (!day) return null
  const otherDays = changedDates
    .filter((d) => d !== date)
    .map((d) => ({ date: d, day: plan.days.find((x) => x.date === d) }))
    .filter((x): x is { date: string; day: RoadmapDay } => Boolean(x.day))
  return {
    date,
    day,
    taskState: loaded.taskState,
    diff,
    revision: loaded.revision,
    otherDays: otherDays.length > 0 ? otherDays : undefined,
    // The plan-level marks the client cannot derive from one day: whether the chip says "Adjusted today", and whether Undo is offered.
    lastDiffDate: plan.lastDiffDate ?? null,
    lastDiff: plan.lastDiff ?? null,
    canUndo: loaded.undo !== null,
  }
}

/** Tick the day itself once every work task is done or skipped; a tick is never removed here. */
export function doneAfterTasks(loaded: LoadedRoadmap, plan: RoadmapPlan, taskState: TaskState, evidence: ReadonlySet<string>, date: string): DoneDays {
  const day = plan.days.find((d) => d.date === date)
  if (!day || loaded.done[String(day.day)] === true) return loaded.done
  if (!dayCompleteFromTasks(day, taskState, evidence)) return loaded.done
  return { ...loaded.done, [String(day.day)]: true }
}
