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
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildStudyPlan,
  type PlanBlock,
  type PlanDay,
  type PlanSubjectInput,
  type PlanTopic,
  type Preparedness,
  type StudyPlan,
  type WeekAvailability,
} from '@/lib/plan/build-study-plan'
import { rankTagsByPaper, type TaggedSchemeRow } from '@/lib/plan/high-yield-rank'
import type { DoneDays, HydratedBlock, HydratedDay, HydratedPlan } from '@/lib/plan/plan-view'
import { calculateParentMastery, flattenLeafMasteries, type AttemptLite } from '@/lib/mastery'
import { topicTargetsFromMasteries } from '@/lib/insights/recommendations'
import { getAttemptSubjectCode, type AttemptWithPaper } from '@/lib/syllabi/attempts'
import { getSyllabusSubjectName, getSyllabusTopicByCode, hasSyllabusTree } from '@/lib/syllabi'
import type { SyllabusCode } from '@/lib/syllabus'
import { getSubjectByCode } from '@/lib/profile-options'
import { isIbSubjectCode } from '@/lib/ib/marking-config'
import { timedPaperSlots } from '@/lib/max/paper-practice-links'
import { pastPaperMarkHref } from '@/lib/marking/past-paper-mark-href'
import { normalizePaperSession } from '@/lib/marking/normalize-paper-session'

/** Where /mark sends the student back to after a plan drill. */
export const PLAN_RETURN_PATH = '/dashboard/plan'

const HIGH_YIELD_LIMIT = 8
const WEAK_LIMIT = 5
/** Different questions for consecutive drills on the same topic. */
const CANDIDATES_PER_TOPIC = 6
const SCAN_PAGE = 1000
/** Tag frequency moves when papers are ingested, which is weekly at most. */
const HIGH_YIELD_TTL_MS = 6 * 60 * 60 * 1000

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
  return topicTargetsFromMasteries(masteries, WEAK_LIMIT).map((t) => ({
    code: t.code,
    name: t.name,
    source: 'weak' as const,
    weight: Math.round(byCode.get(t.code)?.percentage ?? 0),
  }))
}

/** Topic lists and paper availability for each requested subject. */
export async function resolvePlanSubjects(
  admin: Admin,
  userId: string,
  codes: string[]
): Promise<PlanSubjectInput[]> {
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
    .limit(300)
  const attempts = (data ?? []) as unknown as AttemptWithPaper[]

  return Promise.all(
    codes.map(async (code) => ({
      code,
      label: subjectLabelFor(code),
      highYield: await fetchHighYieldTopics(admin, code),
      weak: weakTopicsFor(attempts, code),
      hasTimedPaper: timedPaperSlots(code).length > 0,
    }))
  )
}

// --- hydration -------------------------------------------------------------------

type Candidate = { paperCode: string; paperSession: string; questionNumber: string }

async function candidatesFor(admin: Admin, subjectCode: string, topicCode: string): Promise<Candidate[]> {
  const { data } = await admin
    .from('mark_schemes')
    .select('paper_code, paper_session, question_number, total_marks')
    .like('paper_code', `${subjectCode}/%`)
    .contains('syllabus_tags', [topicCode])
    .gte('total_marks', 2)
    .lte('total_marks', 12)
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

function poolKey(subjectCode: string, topicCode: string): string {
  return `${subjectCode}|${topicCode}`
}

/** Attach a real destination to every block that has one. */
export async function hydrateStudyPlan(admin: Admin, plan: StudyPlan): Promise<HydratedPlan> {
  const keys = new Set<string>()
  for (const day of plan.days) {
    for (const b of day.blocks) {
      if (b.kind === 'drill' && b.topic && b.subjectCode && hasSyllabusTree(b.subjectCode)) {
        keys.add(poolKey(b.subjectCode, b.topic.code))
      }
    }
  }
  const pools = new Map<string, Candidate[]>()
  await Promise.all(
    [...keys].map(async (key) => {
      const [subject, topic] = key.split('|') as [string, string]
      pools.set(key, await candidatesFor(admin, subject, topic))
    })
  )

  const drillCursor = new Map<string, number>()
  const paperCursor = new Map<string, number>()

  const hydrateBlock = (block: PlanBlock, day: PlanDay): HydratedBlock => {
    if (block.kind === 'break' || block.kind === 'rest') return block
    if (block.kind === 'review') {
      return { ...block, href: '/dashboard/review', resourceLabel: 'Your marked answers' }
    }
    const code = block.subjectCode
    if (!code) return block

    if (block.kind === 'timed_paper') {
      const slots = timedPaperSlots(code)
      if (slots.length === 0) return block
      const i = paperCursor.get(code) ?? 0
      paperCursor.set(code, i + 1)
      const slot = slots[i % slots.length]!
      return { ...block, href: slot.href, resourceLabel: slot.label }
    }

    // drill
    if (block.topic && hasSyllabusTree(code)) {
      const key = poolKey(code, block.topic.code)
      const pool = pools.get(key) ?? []
      if (pool.length > 0) {
        const i = drillCursor.get(key) ?? 0
        drillCursor.set(key, i + 1)
        const c = pool[i % pool.length]!
        return {
          ...block,
          href: pastPaperMarkHref({
            paperCode: c.paperCode,
            paperSession: c.paperSession,
            questionNumber: c.questionNumber,
            pattern: block.topic.name,
            reason: `Day ${day.day} of your plan — ${block.topic.name}`,
            returnTo: PLAN_RETURN_PATH,
          }),
          resourceLabel: `Q${c.questionNumber} · ${c.paperCode} ${sessionLabel(c.paperSession)}`,
        }
      }
    }
    // Nothing banked for this topic (IB, or not tagged yet): /mark generates
    // one for the topic, or opens the subject's desk.
    const params = new URLSearchParams({ subject: code, return: PLAN_RETURN_PATH })
    if (block.topic) params.set('topic', block.topic.code)
    return {
      ...block,
      href: `/mark?${params.toString()}`,
      resourceLabel: block.topic ? 'A fresh question on this topic' : 'Practice desk',
    }
  }

  const days: HydratedDay[] = plan.days.map((day) => ({
    ...day,
    blocks: day.blocks.map((b) => hydrateBlock(b, day)),
  }))

  return { ...plan, days, generatedAt: new Date().toISOString() }
}

// --- persistence -------------------------------------------------------------------

export type SavedPlan = { plan: HydratedPlan; done: DoneDays }

export async function loadStudyPlan(admin: Admin, userId: string): Promise<SavedPlan | null> {
  const { data } = await admin
    .from('study_plans')
    .select('plan, done_days')
    .eq('user_id', userId)
    .maybeSingle()
  if (!data?.plan) return null
  return {
    plan: data.plan as HydratedPlan,
    done: ((data.done_days as DoneDays | null) ?? {}) as DoneDays,
  }
}

export type BuildPlanRequest = {
  startDate: string
  examDate: string
  preparedness: Preparedness
  minutesPerDay: number
  availability: WeekAvailability
  subjectCodes: string[]
}

/** Build, hydrate and store — replacing any previous plan and its ticks. */
export async function buildAndSaveStudyPlan(
  admin: Admin,
  userId: string,
  req: BuildPlanRequest
): Promise<SavedPlan> {
  const subjects = await resolvePlanSubjects(admin, userId, req.subjectCodes)
  const plan = buildStudyPlan({
    startDate: req.startDate,
    examDate: req.examDate,
    preparedness: req.preparedness,
    minutesPerDay: req.minutesPerDay,
    availability: req.availability,
    subjects,
  })
  const hydrated = await hydrateStudyPlan(admin, plan)
  const now = hydrated.generatedAt

  const { error } = await admin.from('study_plans').upsert(
    {
      user_id: userId,
      exam_date: req.examDate,
      preparedness: req.preparedness,
      minutes_per_day: hydrated.minutesPerDay,
      availability: hydrated.availability,
      subjects: hydrated.subjects,
      plan: hydrated,
      done_days: {},
      generated_at: now,
      updated_at: now,
      checkin_last_sent_at: null,
    },
    { onConflict: 'user_id' }
  )
  if (error) throw new Error(`study_plans upsert failed: ${error.message}`)
  return { plan: hydrated, done: {} }
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
