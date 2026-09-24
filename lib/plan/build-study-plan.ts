/**
 * A day-by-day study plan from now until the exam.
 *
 * Asked for, almost verbatim, by a student with nineteen days left: "input
 * exam date, subjects and preparedness, and get a Day 1 / Day 2 plan that works
 * around tuition and has breaks built in." The pieces existed separately — a
 * Max-only sprint pack, a recommendation engine, exam dates on 114 profiles,
 * topic-frequency data for the biggest subjects — and nothing joined them for
 * the student who has not paid and has not marked anything yet.
 *
 * This module is pure. It takes numbers and lists and returns a plan; it never
 * touches the database or the clock. The hydration into real past-paper
 * questions, and the persistence, live in lib/plan/study-plan-service.ts. Pure
 * so the scheduling rules can be tested exhaustively, because a plan that
 * schedules a timed paper on the morning of the exam, or three hours on a day
 * the student said they have tuition, is worse than no plan at all.
 *
 * The rules, and why:
 *
 *   Preparedness picks the MIX, not the volume. "Pass" is high-yield topics
 *   only — the ones that turn up in the most papers — because with days left
 *   the highest-return hour is on what is almost certain to be asked. "Secure"
 *   spends its drills on the student's own weak topics and adds timed papers.
 *   "Stretch" is timed papers first, with drills on whatever still bleeds marks.
 *
 *   Commitments are hard. A weekday the student marked as 0 minutes gets a rest
 *   day, not a smaller plan, and a weekday with 45 minutes gets exactly one
 *   focused block. The student told us; we do not negotiate.
 *
 *   Breaks are in the plan, not a tip. A block is 25 minutes of work and 5 off,
 *   with 15 off after every fourth. The longest block is 50 minutes. A plan that
 *   says "study 3 hours" is a plan that gets abandoned on day two.
 *
 *   The last two days are review only — nothing new, no timed papers. Day 0 is
 *   the exam and gets one line.
 *
 *   One rest day a week when there are at least ten days. The student who asked
 *   for this said "healthy breaks to prevent burnout" and they were right.
 *
 * buildStudyPlan() is that first planner, kept as it was for legacy bodies
 * and the client-side shape preview. buildRoadmap(), further down, is the
 * same calendar grown into the Exam Roadmap (docs/EXAM_ROADMAP.md): the
 * student's real week with clock times, a ranked topic pool per subject with
 * a loop of steps per topic, a reason on every task, and a validator.
 */

import { examEncouragement } from '@/lib/dashboard/exam-date'
import {
  dayCapacity,
  deriveMinutesPerDay,
  deriveWeekAvailability,
  layoutDay,
  reservePaperSlot,
  subtractIntervals,
  type DaySlot,
  type ExamOnDate,
  type Interval,
} from '@/lib/plan/availability'
import { assessFeasibility } from '@/lib/plan/feasibility'
import {
  DIAGNOSE_WHEN_UNCERTAINTY_AT_LEAST,
  MIN_TASK_MINUTES,
  MODE_TO_LEGACY_PREPAREDNESS,
  MODE_WEIGHTS,
  REVIEW_GAP_MAX_STUDY_DAYS,
  STEP_GAP_DAYS,
  STEP_MINUTES,
  STRONG_TOPIC_LOOP,
  SUBJECT_TOUCH_EVERY_STUDY_DAYS,
  TIMED_PAPER_MIN_SESSION,
  WEAK_BELOW_PCT,
  WEAK_TOPIC_LOOP,
  reviewGapDays,
  subjectsPerDay,
} from '@/lib/plan/modes'
import { paperMatchesComponent } from '@/lib/plan/paper-match'
import { WORK_KINDS } from '@/lib/plan/plan-view'
import { eligibleTopics, rankSubjectTopics, syllabusOnlyWhy, type ScoreContext } from '@/lib/plan/priority'
import { clockOf, minuteOfDay, taskIdFor } from '@/lib/plan/roadmap-view'
import {
  BREAK_MINUTES,
  CONFIDENT_ATTEMPTS,
  DEFAULT_AVAILABILITY,
  MIN_BUFFER_MINUTES,
  MIN_DAY_MINUTES,
  TASK_CATEGORY,
  type ClockTime,
  type EvidenceItem,
  type LoopStep,
  type RoadmapAvailability,
  type RoadmapDayExtras,
  type PaperSitting,
  type RoadmapExam,
  type RoadmapMode,
  type RoadmapPlanExtras,
  type RoadmapTaskFields,
  type SelfRating,
  type TaskType,
  type TopicPriority,
  type TopicSignals,
} from '@/lib/plan/roadmap-types'

export type Preparedness = 'pass' | 'secure' | 'stretch'

/**
 * Bumped when a rebuild would give a student a materially better plan than
 * the one they have — a plan carrying an older version (or none) is offered
 * a rebuild, with its ticks carried over. History:
 *   1  first plans (single exam date, no syllabus rotation)
 *   2  syllabus rotation for subjects without frequency data, time zones,
 *      days away, per-subject exam dates, real paper lengths
 *   3  the roadmap: tasks placed by the clock around commitments, a loop per
 *      topic with a reason for every task, feasibility, replans
 */
export const PLAN_VERSION = 3
/** What buildStudyPlan() stamps: the v2 shape, so planOutdated() offers the roadmap rebuild for it. */
export const LEGACY_PLAN_VERSION = 2

/** What a rebuild would add, by version — the rebuild notice reads the current one. */
export const PLAN_VERSION_NOTES: Record<number, string> = {
  2: 'topic-by-topic blocks, your own time zone, days away, a date per subject',
  3: 'blocks placed by the hour around your commitments, a reason for every task, and a plan that adjusts when a day slips',
}

export const PREPAREDNESS_LABEL: Record<Preparedness, string> = {
  pass: 'I need to pass',
  secure: 'I know it, but not well enough',
  stretch: "I'm going for the top grade",
}

export const PREPAREDNESS_BLURB: Record<Preparedness, string> = {
  pass: 'High-yield topics only — what turns up in the most papers — so every hour lands where the marks are.',
  secure: 'Your own weak topics first, with timed papers to close the gaps the marker keeps finding.',
  stretch: 'Timed papers first, then drills on whatever still leaks marks. Exam conditions from day one.',
}

/** Minutes available on each weekday, Monday = 0 … Sunday = 6. */
export type WeekAvailability = [number, number, number, number, number, number, number]

export const DEFAULT_MINUTES_PER_DAY = 90

/** A topic worth time, with the reason we think so. */
export type PlanTopic = {
  code: string
  name: string
  /**
   * 'high_yield' from paper frequency, 'weak' from the student's own marks,
   * 'syllabus' when a subject has a topic tree but no frequency data (IB) —
   * the plan then walks the syllabus in order rather than going generic.
   */
  source: 'high_yield' | 'weak' | 'syllabus'
  /** Papers it appears in (high_yield), the student's percentage (weak), 0 (syllabus). */
  weight: number
}

export type PlanSubjectInput = {
  code: string
  label: string
  /** Ranked high-yield topics for this subject, most frequent first. */
  highYield: PlanTopic[]
  /** The student's weak topics from marked work, weakest first. May be empty. */
  weak: PlanTopic[]
  /** The syllabus leaves in order; the rotation when highYield is empty. */
  syllabus?: PlanTopic[]
  /** Whether a timed paper exists to point at. */
  hasTimedPaper: boolean
  /** The shortest real paper's length in minutes, when known. */
  paperMinutes?: number
  /**
   * This subject's own exam date, when it differs from the plan's. The
   * subject tapers before it, drops out after it, and its exam day is a
   * quiet day in the plan. Defaults to the plan's exam date.
   */
  examDate?: string
}

/**
 * 'learn' (a lesson, worked example or recall step) and 'buffer' (time in
 * hand, never work) arrived with the roadmap. Consumers classify blocks with
 * WORK_KINDS / isWorkBlock in plan-view.ts, never by exclusion.
 */
export type PlanBlockKind = 'drill' | 'timed_paper' | 'review' | 'learn' | 'buffer' | 'break' | 'rest'

export type PlanBlock = {
  kind: PlanBlockKind
  minutes: number
  /** Present for drill / review blocks. */
  subjectCode?: string
  subjectLabel?: string
  topic?: PlanTopic
  /** What the student actually does, in their words. */
  label: string
} & Partial<RoadmapTaskFields>

export type PlanDay = {
  /** 1-based; the last exam itself is not a plan day. */
  day: number
  /** ISO date this day falls on. */
  date: string
  /** Days remaining to the LAST exam at the START of this day. */
  daysLeft: number
  /** 'exam' is a day one subject's paper is sat — nothing else is scheduled. */
  kind: 'study' | 'rest' | 'review' | 'exam'
  /** One line the student reads first. */
  focus: string
  blocks: PlanBlock[]
  /** Total minutes of work (breaks and time in hand excluded). */
  workMinutes: number
} & Partial<RoadmapDayExtras>

export type StudyPlan = {
  /** PLAN_VERSION at build time; older plans are offered a rebuild. */
  version: number
  /** The last exam; the plan ends the day before it. */
  examDate: string
  preparedness: Preparedness
  minutesPerDay: number
  availability: WeekAvailability
  /** Specific dates the student said they are away. Rest days, no argument. */
  blockedDates: string[]
  /** IANA zone the plan's dates are read in — "today" is the student's, not the server's. */
  timeZone: string
  /** Each subject with the date of its own paper (the plan's when not set) — its LAST paper, with every sitting listed when there is more than one. */
  subjects: Array<{ code: string; label: string; examDate: string; papers?: PaperSitting[] }>
  days: PlanDay[]
  /** Total scheduled work across the plan, for the summary line. */
  totalWorkMinutes: number
  /** Something true and encouraging for the top of the page. */
  headline: string
} & Partial<RoadmapPlanExtras>

export type BuildStudyPlanInput = {
  /** The day the plan starts, as ISO date. Usually today. */
  startDate: string
  /** The exam date for every subject that has none of its own. */
  examDate: string
  preparedness: Preparedness
  minutesPerDay: number
  availability: WeekAvailability
  subjects: PlanSubjectInput[]
  /** ISO dates that are off regardless of weekday. */
  blockedDates?: string[]
  timeZone?: string
}

// --- calendar helpers -----------------------------------------------------------

const DAY_MS = 86_400_000
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function parseIsoDay(iso: string): number {
  return Date.UTC(
    Number(iso.slice(0, 4)),
    Number(iso.slice(5, 7)) - 1,
    Number(iso.slice(8, 10))
  )
}

function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** Monday = 0 … Sunday = 6, from an ISO date. */
export function weekdayIndex(iso: string): number {
  const js = new Date(parseIsoDay(iso)).getUTCDay() // Sunday = 0
  return (js + 6) % 7
}

/** Whole days from start to exam, exclusive of the exam day. 0 when exam is today or past. */
export function planLength(startDate: string, examDate: string): number {
  const diff = Math.round((parseIsoDay(examDate) - parseIsoDay(startDate)) / DAY_MS)
  return Math.max(0, diff)
}

// --- block layout ----------------------------------------------------------------

export const FOCUS_BLOCK_MIN = 25
export const SHORT_BREAK_MIN = 5
export const LONG_BREAK_MIN = 15
/** A timed sitting when the real paper length is unknown. */
export const TIMED_PAPER_MIN = 50
/** Below this a day is a rest day: one 25-minute block needs a break either side to be worth it. */
export const MIN_USEFUL_MINUTES = 25

/**
 * Split available minutes into focus blocks with breaks between them.
 *
 * Returns work blocks and the break blocks that separate them, never a trailing
 * break. Long breaks after every fourth block. The last block may be shorter
 * than FOCUS_BLOCK_MIN so the total never exceeds what the student said.
 */
export function layoutBlocks(availableMinutes: number): Array<{ kind: 'work' | 'break'; minutes: number }> {
  const out: Array<{ kind: 'work' | 'break'; minutes: number }> = []
  let remaining = availableMinutes
  let workBlocks = 0

  while (remaining >= MIN_USEFUL_MINUTES) {
    const work = Math.min(FOCUS_BLOCK_MIN, remaining)
    out.push({ kind: 'work', minutes: work })
    remaining -= work
    workBlocks += 1

    const breakLen = workBlocks % 4 === 0 ? LONG_BREAK_MIN : SHORT_BREAK_MIN
    // Only take a break if there is still a useful block after it.
    if (remaining - breakLen >= MIN_USEFUL_MINUTES) {
      out.push({ kind: 'break', minutes: breakLen })
      remaining -= breakLen
    } else {
      break
    }
  }
  return out
}

// --- topic selection --------------------------------------------------------------

/**
 * The ordered list of topics a subject should cycle through, by preparedness.
 *
 * pass:    high-yield only, in frequency order. Weak topics are folded in ONLY
 *          where they are also high-yield — a weak topic that never comes up is
 *          not worth an hour with days left.
 * secure:  weak topics first, then high-yield to fill.
 * stretch: high-yield first (the questions that are certainly coming), then
 *          weak. Timed papers carry most of the load for this student.
 *
 * Where there is no frequency data (IB — no mark schemes are tagged), the
 * syllabus in order stands in for high-yield: a plan that walks the whole
 * syllabus beats one that says "a question" nineteen times.
 *
 * Always de-duplicated by code, and never empty when the subject has anything:
 * a subject with no topic data at all yields [] and the day falls back to a
 * timed paper or generic practice.
 */
export function topicRotation(subject: PlanSubjectInput, preparedness: Preparedness): PlanTopic[] {
  const seen = new Set<string>()
  const take = (list: PlanTopic[]) => list.filter((t) => (seen.has(t.code) ? false : (seen.add(t.code), true)))
  const base = subject.highYield.length > 0 ? subject.highYield : (subject.syllabus ?? [])

  if (preparedness === 'pass') {
    const inBase = new Set(base.map((t) => t.code))
    const weakAndYield = subject.weak.filter((t) => inBase.has(t.code))
    return [...take(weakAndYield), ...take(base)]
  }
  if (preparedness === 'secure') {
    return [...take(subject.weak), ...take(base)]
  }
  return [...take(base), ...take(subject.weak)]
}

/** How many timed papers the plan should contain, by preparedness and length. */
export function timedPaperCount(preparedness: Preparedness, studyDays: number): number {
  if (studyDays < 4) return 0
  const perWeek = preparedness === 'stretch' ? 3 : preparedness === 'secure' ? 2 : 1
  return Math.max(1, Math.round((studyDays / 7) * perWeek))
}

// --- the plan ---------------------------------------------------------------------

function restDay(day: number, date: string, daysLeft: number, reason: string): PlanDay {
  return {
    day,
    date,
    daysLeft,
    kind: 'rest',
    focus: reason,
    blocks: [{ kind: 'rest', minutes: 0, label: reason }],
    workMinutes: 0,
  }
}

export function buildStudyPlan(input: BuildStudyPlanInput): StudyPlan {
  const minutesPerDay = Math.max(0, Math.round(input.minutesPerDay))
  const availability = input.availability.map((m) =>
    Math.max(0, Math.min(minutesPerDay, Math.round(m)))
  ) as WeekAvailability
  const timeZone = input.timeZone?.trim() || 'UTC'
  const blocked = new Set((input.blockedDates ?? []).filter((d) => ISO_DATE.test(d)))

  // Each subject sits its paper on its own date (the plan's by default).
  // A subject whose exam has passed is not planned; the plan runs to the
  // day before the LAST exam.
  const subjects = input.subjects
    .filter((s) => s.code)
    .map((s) => ({ ...s, examDate: s.examDate && ISO_DATE.test(s.examDate) ? s.examDate : input.examDate }))
    .filter((s) => planLength(input.startDate, s.examDate) > 0)
  const examDate = subjects.reduce((max, s) => (s.examDate > max ? s.examDate : max), subjects[0]?.examDate ?? input.examDate)
  const length = planLength(input.startDate, examDate)

  const days: PlanDay[] = []
  if (length === 0 || subjects.length === 0) {
    return {
      version: PLAN_VERSION,
      examDate,
      preparedness: input.preparedness,
      minutesPerDay,
      availability,
      blockedDates: [...blocked].sort(),
      timeZone,
      subjects: subjects.map((s) => ({ code: s.code, label: s.label, examDate: s.examDate })),
      days,
      totalWorkMinutes: 0,
      headline:
        input.subjects.length === 0
          ? 'Add at least one subject to build a plan.'
          : "Your exam is today or has passed — there's nothing to schedule.",
    }
  }

  const startMs = parseIsoDay(input.startDate)
  const dates = Array.from({ length }, (_, i) => isoDay(startMs + i * DAY_MS))

  // Exam days inside the plan (a subject's paper before the last one): a
  // quiet day, nothing scheduled, like a blocked date.
  const examOn = new Map<string, typeof subjects>()
  for (const s of subjects) {
    if (s.examDate < examDate) examOn.set(s.examDate, [...(examOn.get(s.examDate) ?? []), s])
  }
  const available = dates.map((d) =>
    blocked.has(d) || examOn.has(d) ? 0 : availability[weekdayIndex(d)]
  )

  // Which subjects are still ahead of their paper on day i, and which of
  // those are in their two-day taper.
  const liveOn = (i: number) => subjects.filter((s) => dates[i]! < s.examDate)
  const tapering = (i: number, s: (typeof subjects)[number]) => planLength(dates[i]!, s.examDate) <= 2
  const allTaper = (i: number) => {
    const live = liveOn(i)
    return live.length > 0 && live.every((s) => tapering(i, s))
  }
  // Once every live subject is tapering it stays that way (subjects only
  // leave), so the plan's own review taper starts at the first such day.
  let reviewFrom = length
  for (let i = 0; i < length; i++) {
    if (allTaper(i)) {
      reviewFrom = i
      break
    }
  }

  // Weekly rest: pick the weekday with the least availability among study
  // days, and rest on it once per 7-day window — but never inside the taper.
  const restIndexes = new Set<number>()
  if (length >= 10) {
    for (let w = 0; w * 7 < reviewFrom; w++) {
      const lo = w * 7
      const hi = Math.min(reviewFrom, lo + 7)
      let best = -1
      let bestMin = Infinity
      for (let i = lo; i < hi; i++) {
        // Never the day the plan was built: the student asked for a plan,
        // not a day off. (Seen in the first real dry run.)
        if (i === 0) continue
        if (available[i]! < MIN_USEFUL_MINUTES) continue // already a rest day
        const m = available[i]!
        const weekend = weekdayIndex(dates[i]!) >= 5
        const bestWeekend = best >= 0 && weekdayIndex(dates[best]!) >= 5
        // Lightest day wins; on a tie prefer a weekend day, then the later one.
        if (m < bestMin || (m === bestMin && (weekend || !bestWeekend))) {
          bestMin = m
          best = i
        }
      }
      // Only impose a rest day if the window has no natural one already.
      const hasNatural = dates.slice(lo, hi).some((_, k) => available[lo + k]! < MIN_USEFUL_MINUTES)
      if (!hasNatural && best >= 0 && hi - lo >= 5) restIndexes.add(best)
    }
  }

  const studyIndexes = dates
    .map((_, i) => i)
    .filter((i) => i < reviewFrom && available[i]! >= MIN_USEFUL_MINUTES && !restIndexes.has(i))

  // Timed papers: one budget for the plan, shared between subjects by how
  // many study days each still has before its own taper. Spread evenly over
  // a subject's own days, never the first study day, never in its taper,
  // never two papers on one day.
  const paperDays = new Map<number, (typeof subjects)[number]>()
  const paperSubjects = subjects.filter((s) => s.hasTimedPaper)
  if (paperSubjects.length > 0 && studyIndexes.length > 1) {
    const budget = timedPaperCount(input.preparedness, studyIndexes.length)
    const ownDays = (s: (typeof subjects)[number]) =>
      studyIndexes.filter((i) => dates[i]! < s.examDate && !tapering(i, s))
    const spans = paperSubjects.map((s) => ownDays(s).length)
    const spanTotal = spans.reduce((a, b) => a + b, 0)
    paperSubjects.forEach((s, si) => {
      const share = spanTotal > 0 && spans[si]! > 0 ? Math.max(1, Math.round((budget * spans[si]!) / spanTotal)) : 0
      // A sitting shorter than TIMED_PAPER_MIN is not a paper; a 45-minute
      // Saturday gets a drill, not "the first 45 minutes of a paper".
      const eligible = ownDays(s).filter(
        (i) => i !== studyIndexes[0] && available[i]! >= TIMED_PAPER_MIN && !paperDays.has(i)
      )
      if (share === 0 || eligible.length === 0) return
      const step = eligible.length / Math.min(share, eligible.length)
      for (let k = 0; k < Math.min(share, eligible.length); k++) {
        let pos = Math.min(eligible.length - 1, Math.floor((k + 0.5) * step))
        while (pos < eligible.length && paperDays.has(eligible[pos]!)) pos += 1
        if (pos >= eligible.length) break
        paperDays.set(eligible[pos]!, s)
      }
    })
  }

  // Rotate subjects and, within each, their topics.
  const rotations = subjects.map((s) => ({ subject: s, topics: topicRotation(s, input.preparedness), cursor: 0 }))
  let subjectCursor = 0
  let totalWork = 0

  const reviewBlock = (rot: (typeof rotations)[number], k: number, minutes: number): PlanBlock => {
    const topic = rot.topics[k % Math.max(rot.topics.length, 1)]
    return {
      kind: 'review',
      minutes,
      subjectCode: rot.subject.code,
      subjectLabel: rot.subject.label,
      topic,
      label: topic
        ? `Re-read your marked answers on ${topic.name} — the ink, not the notes`
        : `Re-read your marked ${rot.subject.label} answers — the ink, not the notes`,
    }
  }

  for (let i = 0; i < length; i++) {
    const date = dates[i]!
    const daysLeft = length - i
    const dayNum = i + 1
    const minutes = available[i]!

    const exams = examOn.get(date)
    if (exams) {
      const names = exams.map((s) => s.label).join(' and ')
      const reason = `${names} exam today. Nothing else is scheduled.`
      days.push({ day: dayNum, date, daysLeft, kind: 'exam', focus: reason, blocks: [{ kind: 'rest', minutes: 0, label: reason }], workMinutes: 0 })
      continue
    }

    const live = liveOn(i)
    const liveRotations = rotations.filter((r) => live.includes(r.subject))
    if (liveRotations.length === 0) {
      days.push(restDay(dayNum, date, daysLeft, 'Rest day.'))
      continue
    }

    if (i >= reviewFrom) {
      // Taper: review only, at most two blocks, no new topics.
      const layout = layoutBlocks(Math.min(minutes, 2 * FOCUS_BLOCK_MIN + SHORT_BREAK_MIN))
      const blocks: PlanBlock[] = []
      let work = 0
      let k = 0
      for (const b of layout) {
        if (b.kind === 'break') {
          blocks.push({ kind: 'break', minutes: b.minutes, label: `${b.minutes} min off` })
          continue
        }
        blocks.push(reviewBlock(liveRotations[(subjectCursor + k) % liveRotations.length]!, k, b.minutes))
        work += b.minutes
        k += 1
      }
      totalWork += work
      days.push({
        day: dayNum,
        date,
        daysLeft,
        kind: 'review',
        focus:
          daysLeft === 1
            ? 'Light review, then stop. Sleep is revision too.'
            : 'Review only — nothing new from here.',
        blocks: work > 0 ? blocks : [{ kind: 'rest', minutes: 0, label: 'Rest.' }],
        workMinutes: work,
      })
      continue
    }

    if (minutes < MIN_USEFUL_MINUTES) {
      days.push(
        restDay(
          dayNum,
          date,
          daysLeft,
          blocked.has(date) ? "Rest day — you told us you're away." : 'Rest day — you told us this one is full.'
        )
      )
      continue
    }
    if (restIndexes.has(i)) {
      days.push(restDay(dayNum, date, daysLeft, 'Rest day. The plan is built to hold without it.'))
      continue
    }

    const blocks: PlanBlock[] = []
    let work = 0

    const paperSubject = paperDays.get(i)
    if (paperSubject) {
      // A real paper's length when the day has room for it; otherwise the
      // day's budget, and the label says it is the first part of a paper.
      const fullPaper = paperSubject.paperMinutes ?? TIMED_PAPER_MIN
      const paperMin = Math.min(fullPaper, minutes)
      blocks.push({
        kind: 'timed_paper',
        minutes: paperMin,
        subjectCode: paperSubject.code,
        subjectLabel: paperSubject.label,
        label:
          paperMin < fullPaper
            ? `Timed ${paperSubject.label} paper — the first ${paperMin} min of a ${fullPaper}-min paper, no notes, then mark it`
            : `Timed ${paperSubject.label} paper — ${paperMin} min, no notes, then mark it`,
      })
      work += paperMin
      const left = minutes - paperMin - LONG_BREAK_MIN
      if (left >= MIN_USEFUL_MINUTES) {
        blocks.push({ kind: 'break', minutes: LONG_BREAK_MIN, label: `${LONG_BREAK_MIN} min off` })
        const rot = rotations.find((r) => r.subject.code === paperSubject.code) ?? liveRotations[0]!
        const topic = rot.topics[rot.cursor % Math.max(rot.topics.length, 1)]
        if (topic) rot.cursor += 1
        const drillMin = Math.min(FOCUS_BLOCK_MIN, left)
        blocks.push({
          kind: 'drill',
          minutes: drillMin,
          subjectCode: rot.subject.code,
          subjectLabel: rot.subject.label,
          topic,
          label: topic
            ? `Fix what the paper exposed: ${topic.name}`
            : `Fix what the paper exposed in ${rot.subject.label}`,
        })
        work += drillMin
      }
      totalWork += work
      days.push({
        day: dayNum,
        date,
        daysLeft,
        kind: 'study',
        focus: `Timed paper day — ${paperSubject.label} under exam conditions.`,
        blocks,
        workMinutes: work,
      })
      continue
    }

    // Drill day: alternate live subjects across the day's blocks, one topic
    // per block. A subject inside its own taper gets review blocks instead.
    const layout = layoutBlocks(minutes)
    let k = 0
    const drillSubjects = new Set<string>()
    const reviewSubjects = new Set<string>()
    for (const b of layout) {
      if (b.kind === 'break') {
        blocks.push({ kind: 'break', minutes: b.minutes, label: `${b.minutes} min off` })
        continue
      }
      const rot = liveRotations[(subjectCursor + k) % liveRotations.length]!
      if (tapering(i, rot.subject)) {
        blocks.push(reviewBlock(rot, k, b.minutes))
        reviewSubjects.add(rot.subject.label)
        work += b.minutes
        k += 1
        continue
      }
      const topic = rot.topics.length ? rot.topics[rot.cursor % rot.topics.length] : undefined
      if (topic) rot.cursor += 1
      drillSubjects.add(rot.subject.label)
      blocks.push({
        kind: 'drill',
        minutes: b.minutes,
        subjectCode: rot.subject.code,
        subjectLabel: rot.subject.label,
        topic,
        label: topic
          ? topic.source === 'weak'
            ? `${topic.name} — you lost marks here; one question, then mark it`
            : topic.source === 'high_yield'
              ? `${topic.name} — in ${topic.weight} recent papers; one question, then mark it`
              : `${topic.name} — one question, then mark it`
          : `A past-paper ${rot.subject.label} question — mark it, read the ink`,
      })
      work += b.minutes
      k += 1
    }
    // Advance so tomorrow starts on the next subject, keeping rotation fair.
    subjectCursor = (subjectCursor + Math.max(1, k)) % liveRotations.length
    totalWork += work

    const drillCount = blocks.filter((b) => b.kind === 'drill').length
    const drillList = [...drillSubjects]
    const reviewList = [...reviewSubjects]
    const focus =
      drillList.length > 0
        ? `${drillList.join(' and ')} — ${drillCount} focused ${drillCount === 1 ? 'block' : 'blocks'}${
            reviewList.length > 0 ? `; ${reviewList.join(' and ')} review only.` : '.'
          }`
        : `${reviewList.join(' and ')} — review only.`
    days.push({ day: dayNum, date, daysLeft, kind: 'study', focus, blocks, workMinutes: work })
  }

  const hours = Math.round((totalWork / 60) * 10) / 10
  const studyDayCount = days.filter((d) => d.workMinutes > 0).length
  return {
    // The last engine that produced this shape: a v2-shaped plan keeps the offer of a roadmap rebuild.
    version: LEGACY_PLAN_VERSION,
    examDate,
    preparedness: input.preparedness,
    minutesPerDay,
    availability,
    blockedDates: [...blocked].sort(),
    timeZone,
    subjects: subjects.map((s) => ({ code: s.code, label: s.label, examDate: s.examDate })),
    days,
    totalWorkMinutes: totalWork,
    headline: planHeadline(length, hours, studyDayCount),
  }
}

/** "19 days to go. … 12.5 focused hours across 17 days, breaks included." — with its plurals right for a one-day plan. */
function planHeadline(length: number, hours: number, studyDayCount: number): string {
  return `${length} day${length === 1 ? '' : 's'} to go. ${examEncouragement(length)} ${hours} focused ${hours === 1 ? 'hour' : 'hours'} across ${studyDayCount} ${studyDayCount === 1 ? 'day' : 'days'}, breaks included.`
}

// --- the roadmap (v3) ----------------------------------------------------------------
//
// The same calendar rules as above, with three things the first planner did
// not have: the student's real week (windows, commitments, no-study spans),
// a ranked topic pool per subject with a loop of steps for each topic, and
// a reason on every task. The build is greedy and forward-only — each day
// is filled from what the days before it left open — and a validator at the
// end says whether the invariants held.
//
// A second pass, from building fourteen plans and reading them as a student
// would: a leftover slot opens a topic rather than sitting in hand (one
// subject used to lay 30 of 90 minutes); day 1 is laid from the clock when
// the build says what time it is; spaced reviews keep coming at widening
// gaps and mixed sets name the topics they rotate through, so a 90-day
// plan is not eleven weeks of the same card; the eve of a paper is the
// lightest review day, weakest first, and not yesterday again; two
// subjects' papers never sit on consecutive study days and the paper-day
// review is of the paper; a timed set sleeps before its error review; a
// weekday the student set to zero says so; a subject rated "not started"
// opens on the lesson, not a quiz.

export type RoadmapDestinations = {
  /** Topic codes with a lesson: a diagnostic, concept, worked example or recall step can point somewhere. */
  lesson: string[]
  /** Topic codes with a banked question of at most a few marks (a diagnostic). */
  shortQuestion: string[]
  /** Topic codes with any banked question of a block's length (question, timed set, mixed). */
  question: string[]
}

export type RoadmapSubjectInput = PlanSubjectInput & {
  signals?: TopicSignals[]
  selfRating?: SelfRating
  component?: string
  examTime?: ClockTime
  board?: string
  qualification?: string
  /** Absent: every topic has a question destination (/mark generates one) and no lesson. */
  destinations?: RoadmapDestinations
  /**
   * Every paper the student sits in this subject, when there is more than
   * one (Business Paper 1 on the 5th, Paper 2 on the 8th). Absent or empty:
   * one sitting, read from examDate / component / examTime / paperMinutes.
   * The subject's finish line is its last paper; each paper gets its own
   * taper and its own exam-day commitment, and a topic tagged for one paper
   * is not scheduled after that paper has been sat.
   */
  papers?: PaperSitting[]
}

export type BuildRoadmapInput = {
  startDate: string
  examDate: string
  mode: RoadmapMode
  availabilityDetail: RoadmapAvailability
  subjects: RoadmapSubjectInput[]
  blockedDates?: string[]
  timeZone?: string
  selfRatings?: Record<string, SelfRating>
  durationScale?: Partial<Record<TaskType, number>>
  targetGrade?: string | null
  prioritySubject?: string | null
  /**
   * The minute of the day (in the plan's zone) the build is happening at.
   * Day 1 is laid from a few minutes after it, so a plan built at 20:30 does
   * not show four tasks at 16:00 that can no longer happen. Absent: day 1 is
   * laid from the start of its windows, as every other day.
   */
  startMinute?: number
}

export type RoadmapBuild = { plan: StudyPlan; pools: Record<string, TopicPriority[]> }

/** Block kind for each task type: what v2 readers see. */
export const TASK_KIND: Record<TaskType, PlanBlockKind> = {
  diagnostic: 'drill',
  question: 'drill',
  timed_set: 'drill',
  mixed: 'drill',
  concept: 'learn',
  worked_example: 'learn',
  recall: 'learn',
  review: 'review',
  error_review: 'review',
  timed_paper: 'timed_paper',
  buffer: 'buffer',
  break: 'break',
  rest: 'rest',
}

/** Time in hand, in the student's words. */
export const BUFFER_LABEL = 'In hand — use it if you need it, or stop early.'

/** Why a topic starts on its lesson (or its question) rather than a short check. */
export const NO_DIAGNOSTIC_LESSON = 'No short check exists for this topic yet, so we start with the lesson.'
export const NO_DIAGNOSTIC_QUESTION = 'No short check exists for this topic yet, so we start with the question.'

/**
 * The last two days before a subject's own paper are review only for that
 * subject. Counted in study days when fewer than two calendar days carry
 * any capacity: a student whose weekdays are off still gets a light last
 * session before a Friday paper, on the weekend before it.
 */
const TAPER_DAYS = 2
/** A taper day holds at most this many sessions of review for one subject (the two days nearest the paper are lighter still). */
const TAPER_SESSIONS = 2
/**
 * The last study day before a paper holds at most this much review, and
 * this many cards, whatever the session length. On 60-minute sessions the
 * eve used to be the heaviest review day of the plan, under a line that
 * said "light review, then stop".
 */
const EVE_REVIEW_MINUTES = 45
const EVE_REVIEW_TASKS = 4
/** A subject with nothing left to open still fills its slots with mixed practice, up to this many sets a day. */
const MIXED_FALLBACK_PER_DAY = 2
/** A subject opens at most this many new topics on one day (Foundation: one while any loop is open), so leftovers fill the day without fragmenting it. */
const MAX_OPENINGS_PER_DAY = 3
/**
 * Long days. The per-day caps above were sized for evenings of up to three
 * hours; a student who has set aside six needs the slots filled, not left
 * in hand next to "waits until later". Above LONG_DAY_FROM minutes of
 * capacity each cap grows by one per LONG_DAY_STEP, so a 6 h day opens up
 * to five topics per subject and holds four mixed sets, and Foundation may
 * open a second topic while one waits. A timed paper on a long day is
 * followed by an ordinary study afternoon (the marking allowance stays in
 * hand) rather than the rest of the day going quiet.
 */
export const LONG_DAY_FROM = 180
const LONG_DAY_STEP = 90
function longDayExtra(capacity: number): number {
  return Math.floor(Math.max(0, capacity - LONG_DAY_FROM) / LONG_DAY_STEP)
}
/** How many new topics one subject may open on a day of this capacity. */
export function openingsCapFor(capacity: number, mode: RoadmapMode, loopWaiting: boolean): number {
  // Foundation opens one topic at a time on an evening; a six-hour day would sit half empty at that pace, so it climbs at the same slope from one.
  if (mode === 'foundation' && loopWaiting) return 1 + longDayExtra(capacity)
  return MAX_OPENINGS_PER_DAY + longDayExtra(capacity)
}
/** How many mixed sets one subject may fall back on in a day of this capacity. */
export function mixedCapFor(capacity: number): number {
  return MIXED_FALLBACK_PER_DAY + longDayExtra(capacity)
}
/** A mixed set names up to this many proved topics — the ones longest since their last review — so it is never a bare card. */
const MIXED_FOCUS_TOPICS = 3
/** Which of a topic's evidence lines a mixed set carries, most specific first; types not listed rank last. */
const MIXED_WHY_RANK: ReadonlyArray<EvidenceItem['type']> = ['weak_area', 'diagnostic', 'recent_practice', 'frequency', 'prerequisite', 'review_due', 'nearest_paper', 'self_rated', 'mode', 'on_syllabus']
/** A plan built mid-window lays day 1 from this many minutes after now: time to read the page, not to start at once. */
const START_GRACE_MINUTES = 5
/** Marking a timed paper takes time too: at least this, or a tenth of the paper, is kept in hand after the sitting. */
const PAPER_MARKING_MIN = 10
const PAPER_MARKING_SHARE = 0.1
/** The share of a subject's must-cover topics on the weak loop above which its first paper waits for the first third of its study days. */
const PAPERS_WAIT_WHEN_WEAK_SHARE = 0.5
/** Why a mixed set is on the plan when the subject has no topic index to draw on. */
export const NO_TOPIC_INDEX_LINE = 'This subject has no topic index on MarkScheme yet, so the practice is general — and it still counts.'
export const MIXED_WHY_LINE = 'Mixed practice keeps earlier topics warm while the plan moves on.'
/** Why a not-started subject opens on the lesson rather than a quick check: there is nothing yet to check. */
export const NOT_STARTED_LESSON_LINE = "You said you haven't started this yet, so we begin with the lesson."
/** Day 1 when the plan is built with too little of the day left to study: what tomorrow opens with, or a plain restart. */
export const BUILT_LATE_PREFIX = 'Built this evening'
export const BUILT_LATE_FRESH = `${BUILT_LATE_PREFIX} — tomorrow starts fresh.`

/** Minutes kept in hand after a timed paper for marking it. */
export function paperMarkingMinutes(paperMinutes: number): number {
  return Math.max(PAPER_MARKING_MIN, Math.round((paperMinutes * PAPER_MARKING_SHARE) / 5) * 5)
}

function round5(n: number): number {
  return Math.round(n / 5) * 5
}

/** A step's length for this student: the template minutes, scaled, rounded to five, never below the type's floor. */
export function stepMinutesFor(type: TaskType, durationScale: Partial<Record<TaskType, number>> | undefined): number {
  const base = (STEP_MINUTES as Partial<Record<TaskType, number>>)[type] ?? MIN_TASK_MINUTES[type]
  const scale = durationScale?.[type] ?? 1
  return Math.max(MIN_TASK_MINUTES[type], round5(base * scale))
}

/**
 * Timed papers the plan holds, from the mode's timed share: none under four
 * study days, at least one otherwise. The share is a share of study
 * minutes, so a plan of six-hour days holds more sittings than one of
 * evenings: the count scales with the average study day up to twice an
 * evening's worth (LONG_DAY_FROM), never beyond — still one sitting a day.
 */
export function timedPaperBudget(mode: RoadmapMode, studyDays: number, averageCapacity?: number): number {
  if (studyDays < 4) return 0
  const factor = typeof averageCapacity === 'number' && averageCapacity > 0 ? Math.min(2, Math.max(1, averageCapacity / LONG_DAY_FROM)) : 1
  return Math.max(1, Math.round(studyDays * MODE_WEIGHTS[mode].timedShare * factor))
}

/** What the card says to do, from the topic name, the subject and the numbers — never marker output. */
export function objectiveFor(
  type: TaskType,
  opts: {
    topic?: string
    subject: string
    minutes: number
    paperLabel?: string
    board?: string
    fresh?: boolean
    /** A mixed set's named topics, oldest review first; absent, the set is general. */
    topics?: string[]
    /** An error review of the day's timed paper rather than of one topic's answers. */
    afterPaper?: boolean
  }
): string {
  const t = opts.topic
  // IB sciences and humanities are marked against marking points, not method steps; the wording follows the board.
  const ib = (opts.board ?? '').trim().toUpperCase() === 'IB'
  switch (type) {
    case 'diagnostic':
      return `Quick check on ${t}: a few short questions, no notes — this sets where you start.`
    case 'concept':
      return ib
        ? `Read the ${t} lesson's key ideas; explain the main points in your own words.`
        : `Read the ${t} lesson's key ideas and one worked example; write the method in your own words.`
    case 'worked_example':
      return `Work through one ${t} example with the solution covered, then compare line by line.`
    case 'recall':
      return `Flashcards or quick check on ${t} from memory — write before you look.`
    case 'question':
      if (ib) {
        return t
          ? `Answer one ${t} question and mark it against the markscheme; note which marking point it lost.`
          : `Answer one ${opts.subject} question and mark it against the markscheme; note which marking point it lost.`
      }
      return t
        ? `Complete one ${t} past-paper question and mark it; fix the step that lost marks.`
        : `Complete one ${opts.subject} past-paper question and mark it; fix the step that lost marks.`
    case 'timed_set':
      return t
        ? `Two or three ${t} questions in ${opts.minutes} minutes, then mark them.`
        : `Two or three ${opts.subject} questions in ${opts.minutes} minutes, then mark them.`
    case 'error_review':
      // One marked set is not yet a pattern: the review asks which step lost marks, not what "keeps" happening.
      if (opts.afterPaper) return `Re-read today's marked ${opts.subject} paper; note which step lost marks most often.`
      return t
        ? `Re-read your marked ${t} answers; note which step lost marks.`
        : `Re-read your marked ${opts.subject} answers; note which step lost marks.`
    case 'mixed': {
      const names = opts.topics ?? []
      if (names.length === 0) return `Mixed ${opts.subject} questions across recent topics, ${opts.minutes} minutes, then mark.`
      const list = names.length === 1 ? names[0]! : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
      return `Mixed ${opts.subject}: ${list} — ${opts.minutes} minutes, then mark.`
    }
    case 'timed_paper':
      return opts.paperLabel ?? `Timed ${opts.subject} paper — ${opts.minutes} min, no notes; mark it in the time kept in hand after.`
    case 'review':
      // A topic never worked has no marked answer to compare with; it checks against the mark scheme instead.
      if (opts.fresh) {
        return t
          ? `One fresh short question on ${t}, then check it against the mark scheme.`
          : `One fresh short ${opts.subject} question, then check it against the mark scheme.`
      }
      return t
        ? `One fresh short question on ${t}, then compare with your marked answer.`
        : `One fresh short ${opts.subject} question, then compare with your marked answer.`
    case 'buffer':
      return BUFFER_LABEL
    case 'break':
      return `${opts.minutes} min off`
    case 'rest':
      return 'Rest day.'
  }
}

/**
 * v2 inputs as topic signals, so a legacy subject (high-yield, weak,
 * syllabus lists) runs through the v3 engine: syllabus order, no frequency
 * claim, mastery from the weak list's percentages.
 */
export function synthesiseSignals(subject: PlanSubjectInput): TopicSignals[] {
  const seen = new Map<string, TopicSignals>()
  const add = (t: PlanTopic) => {
    if (seen.has(t.code)) return
    seen.set(t.code, { code: t.code, name: t.name, order: seen.size, coreWeight: 1 })
  }
  for (const t of subject.syllabus?.length ? subject.syllabus : subject.highYield) add(t)
  for (const t of subject.highYield) add(t)
  for (const t of subject.weak) add(t)
  for (const w of subject.weak) {
    const s = seen.get(w.code)
    if (s) s.mastery = { percentage: Math.max(0, Math.min(100, w.weight)), attempts: CONFIDENT_ATTEMPTS }
  }
  return [...seen.values()]
}

type Step = { step: LoopStep; taskType: TaskType; provisional: boolean }

/** One topic's loop as the scheduler walks it: the steps up to the proof, then a spaced last step. */
type TopicLoop = {
  entry: TopicPriority
  steps: Step[]
  spaced: Step
  why: EvidenceItem[]
  next: number
  lastStep?: LoopStep
  /** Global study-day ordinal of the last step placed. */
  lastOrdinal?: number
  reviews: number
  /** Global study-day ordinal of the prove step, for the taper's weakest-then-most-recent order. */
  provedOrdinal?: number
  /** Global study-day ordinal the topic was last reviewed or named in a mixed set; the mixed fallback rotates on it. */
  lastSeenOrdinal?: number
}

function hasDestination(type: TaskType, code: string, dest: RoadmapDestinations | null): boolean {
  if (!dest) return type !== 'diagnostic' && type !== 'concept' && type !== 'worked_example' && type !== 'recall'
  switch (type) {
    case 'diagnostic':
      return dest.lesson.includes(code) || dest.shortQuestion.includes(code)
    case 'concept':
    case 'worked_example':
    case 'recall':
      return dest.lesson.includes(code)
    case 'question':
    case 'timed_set':
    case 'mixed':
      return dest.question.includes(code)
    default:
      return true
  }
}

/**
 * The loop for a pool entry given where its topic can go, or null when no
 * step has anywhere to point. A topic with three or more marked answers
 * skips the diagnostic — the marks already set where it starts. A session
 * too short for a timed set proves with a single question instead, so a
 * confident subject on 20-minute sessions still gets to prove.
 *
 * A subject the student rated "not started", on a topic with no marked
 * answer, opens on the lesson: the prior is 0.15 and the loop is already
 * weak, so a quick check would decide nothing and quiz a nervous student
 * on material they said they have never seen. Its steps are settled, not
 * provisional — there is no diagnostic result to re-branch on.
 */
export function loopStepsFor(
  entry: TopicPriority,
  dest: RoadmapDestinations | null,
  opts: { sessionLength?: number; selfRating?: SelfRating } = {}
): { steps: Step[]; spaced: Step; why: EvidenceItem[] } | null {
  const uncertain = entry.uncertainty >= DIAGNOSE_WHEN_UNCERTAINTY_AT_LEAST
  const weak = uncertain ? entry.mastery < WEAK_BELOW_PCT / 100 : entry.loop === 'weak'
  const notStarted =
    opts.selfRating === 'not_started' && entry.uncertainty >= 1 && weak && hasDestination('concept', entry.code, dest)
  const session = opts.sessionLength ?? Number.POSITIVE_INFINITY
  const fit = (s: { step: LoopStep; taskType: TaskType }) =>
    s.taskType === 'timed_set' && session < MIN_TASK_MINUTES.timed_set ? { ...s, taskType: 'question' as TaskType } : s
  const base: Step[] =
    uncertain && !notStarted
      ? [
          { step: 'diagnose', taskType: 'diagnostic', provisional: false },
          ...(weak ? WEAK_TOPIC_LOOP.slice(1) : STRONG_TOPIC_LOOP).map((s) => ({ ...fit(s), provisional: true })),
        ]
      : (weak ? WEAK_TOPIC_LOOP.slice(1) : STRONG_TOPIC_LOOP).map((s) => ({ ...fit(s), provisional: false }))

  const kept = base.filter((s) => hasDestination(s.taskType, entry.code, dest))
  // A review has somewhere to go by itself; a loop that is only reviews is a topic never learned, so it is dropped.
  if (!kept.some((s) => s.taskType !== 'review' && s.taskType !== 'error_review')) return null

  const why = entry.why.map((w) => ({ ...w }))
  const trim = () => {
    while (why.length > 3) {
      const i = why.findIndex((w) => w.type === 'on_syllabus')
      why.splice(i >= 0 ? i : 0, 1)
    }
  }
  if (notStarted) {
    why.push({ type: 'mode', source: 'plan', confidence: 'low', explanation: NOT_STARTED_LESSON_LINE })
    trim()
  } else if (base[0]!.step === 'diagnose' && kept[0]!.step !== 'diagnose') {
    const first = kept[0]!.taskType
    why.push({
      type: 'mode',
      source: 'plan',
      confidence: 'low',
      explanation: first === 'concept' || first === 'worked_example' ? NO_DIAGNOSTIC_LESSON : NO_DIAGNOSTIC_QUESTION,
    })
    trim()
  }

  // The base loop's last step is the spaced one when it survived; the plain
  // retrieval review stands in when it did not (a review always has somewhere to go).
  const last = base[base.length - 1]!
  const lastKept = kept[kept.length - 1]!
  const provisional = kept.some((s) => s.provisional)
  const spaced: Step =
    kept.length > 1 && lastKept.step === last.step && lastKept.taskType === last.taskType
      ? lastKept
      : { step: 'review', taskType: 'review', provisional }
  const steps = spaced === lastKept ? kept.slice(0, -1) : kept
  return { steps, spaced, why }
}

/** Study days a loop's remaining steps need, from the gaps between them (repair → recall waits a day). */
function loopDaysNeeded(steps: Step[], from: number): number {
  let days = 1
  for (let i = Math.max(1, from); i < steps.length; i++) {
    const rule = STEP_GAP_DAYS.find((r) => r.from === steps[i - 1]!.step && r.to === steps[i]!.step)
    if (rule && rule.minDays > 0) days += rule.minDays
  }
  return days
}

/** The task type a step takes in a slot: a timed set the slot cannot hold becomes one marked question. */
function fitStep(type: TaskType, slotMinutes: number): TaskType {
  if (type === 'timed_set' && MIN_TASK_MINUTES.timed_set > slotMinutes && MIN_TASK_MINUTES.question <= slotMinutes) return 'question'
  return type
}

function gapAllows(from: LoopStep | undefined, to: LoopStep, lastOrdinal: number | undefined, ordinal: number): boolean {
  if (from === undefined || lastOrdinal === undefined) return true
  const rule = STEP_GAP_DAYS.find((r) => r.from === from && r.to === to)
  return ordinal - lastOrdinal >= (rule?.minDays ?? 0)
}

/** A spaced review waiting for its day; gap is the study days it waited, doubled for the next one. */
type PendingReview = { loop: TopicLoop; dueOrdinal: number; step: Step; gap: number }

type Subject = RoadmapSubjectInput & { examDate: string; papers: PaperSitting[] }

/** The papers a leaf's syllabus label puts it on, of the subject's sittings: every paper when it carries no label or the paper has no component. */
function papersFor(s: Pick<Subject, 'papers'>, leafPaper: string | undefined): PaperSitting[] {
  return s.papers.filter((p) => !p.component || paperMatchesComponent(leafPaper, p.component) !== false)
}

type SubjectState = {
  subject: Subject
  selfRating?: SelfRating
  pool: TopicPriority[]
  /** The paper each leaf is tagged for, for the one honest line a fresh review may need. */
  paperOf: Map<string, string | undefined>
  dest: RoadmapDestinations | null
  loops: Map<string, TopicLoop>
  open: TopicLoop[]
  placed: Set<string>
  /** Topics whose loop has run to its marked question — what feasibility counts as reached. */
  proved: Set<string>
  dropped: Set<string>
  pending: PendingReview[]
  /** Day indexes this subject can study on, in order: usable, not rest, before its paper. */
  studyDays: number[]
  /** Global study ordinal of the last day it had a task; -1 until then. */
  lastTouched: number
  workMinutes: number
  /** Topics reviewed on this subject's latest review-only day, and the day index; the next such day starts elsewhere. */
  taperReviewed: Set<string>
  taperReviewedOn: number
  /** The review-only day before that one, so rotation holds while the current day is being filled. */
  taperPrev: Set<string>
}

type Slot = { start: number; end: number; minutes: number; leftover?: boolean }

type PlacedTask = { block: PlanBlock; start: number; end: number }

function intervalAt(intervals: Interval[], minute: number): Interval | undefined {
  return intervals.find((iv) => iv.start <= minute && minute < iv.end)
}

function withWindows(detail: RoadmapAvailability): RoadmapAvailability {
  const has = detail.windows.weekday.length > 0 || detail.windows.weekend.length > 0
  return has ? detail : { ...detail, windows: DEFAULT_AVAILABILITY.windows }
}

export function buildRoadmap(input: BuildRoadmapInput, opts: { strict?: boolean } = {}): RoadmapBuild {
  const mode = input.mode
  const weights = MODE_WEIGHTS[mode]
  const timeZone = input.timeZone?.trim() || 'UTC'
  const blocked = new Set((input.blockedDates ?? []).filter((d) => ISO_DATE.test(d)))
  const detail = withWindows(input.availabilityDetail)
  const scale = input.durationScale
  const session = detail.sessionLength
  const rhythm = detail.breakRhythm

  // --- a. the calendar -------------------------------------------------------------
  const subjects: Subject[] = input.subjects
    .filter((s) => s.code)
    .map((s): Subject => {
      const single: PaperSitting = {
        component: s.component,
        examDate: s.examDate && ISO_DATE.test(s.examDate) ? s.examDate : input.examDate,
        examTime: s.examTime,
        paperMinutes: s.paperMinutes,
      }
      const given = (s.papers ?? []).filter((p) => ISO_DATE.test(p.examDate) && planLength(input.startDate, p.examDate) > 0)
      const papers = [...(given.length > 0 ? given : [single])].sort((a, b) => (a.examDate < b.examDate ? -1 : a.examDate > b.examDate ? 1 : 0))
      const first = papers[0]!
      const last = papers[papers.length - 1]!
      // The finish line is the last paper; the single-paper fields read as the nearest paper's for everything that still reads them.
      return { ...s, papers, examDate: last.examDate, component: first.component, examTime: first.examTime, paperMinutes: first.paperMinutes ?? s.paperMinutes }
    })
    .filter((s) => planLength(input.startDate, s.examDate) > 0)
  const examDate = subjects.reduce((max, s) => (s.examDate > max ? s.examDate : max), subjects[0]?.examDate ?? input.examDate)
  const length = planLength(input.startDate, examDate)

  const exams: RoadmapExam[] = subjects.flatMap((s) =>
    s.papers.map((p) => ({
      subjectCode: s.code,
      label: s.label,
      board: s.board ?? '',
      qualification: s.qualification ?? '',
      component: p.component,
      examDate: p.examDate,
      examTime: p.examTime,
      paperMinutes: p.paperMinutes,
    }))
  )
  const shell: Omit<StudyPlan, 'days' | 'totalWorkMinutes' | 'headline'> = {
    version: PLAN_VERSION,
    examDate,
    preparedness: MODE_TO_LEGACY_PREPAREDNESS[mode],
    minutesPerDay: deriveMinutesPerDay(detail),
    availability: deriveWeekAvailability(detail),
    blockedDates: [...blocked].sort(),
    timeZone,
    subjects: subjects.map((s) => ({ code: s.code, label: s.label, examDate: s.examDate, ...(s.papers.length > 1 ? { papers: s.papers.map((p) => ({ ...p })) } : {}) })),
    mode,
    algorithmVersion: PLAN_VERSION,
    revision: 1,
    feasibility: null,
    exams,
    availabilityDetail: detail,
    selfRatings: input.selfRatings ?? {},
    durationScale: input.durationScale,
    targetGrade: input.targetGrade ?? null,
  }
  if (length === 0 || subjects.length === 0) {
    return {
      plan: {
        ...shell,
        days: [],
        totalWorkMinutes: 0,
        headline:
          input.subjects.length === 0
            ? 'Add at least one subject to build a plan.'
            : "Your exam is today or has passed — there's nothing to schedule.",
      },
      pools: {},
    }
  }

  const startMs = parseIsoDay(input.startDate)
  const dates = Array.from({ length }, (_, i) => isoDay(startMs + i * DAY_MS))
  const examsOn: ExamOnDate[] = subjects.flatMap((s) =>
    s.papers.map((p) => ({ date: p.examDate, label: p.component ? `${s.label} ${p.component}` : s.label, examTime: p.examTime, paperMinutes: p.paperMinutes }))
  )
  const caps = dates.map((d) => dayCapacity(d, detail, blocked, examsOn))
  type ExamOn = { subject: Subject; component?: string }
  const examName = (e: ExamOn) => (e.component ? `${e.subject.label} ${e.component}` : e.subject.label)
  const examOn = new Map<string, ExamOn[]>()
  for (const s of subjects) for (const p of s.papers) if (p.examDate < examDate) examOn.set(p.examDate, [...(examOn.get(p.examDate) ?? []), { subject: s, component: p.component }])

  // Built mid-window: day 1 is laid from a few minutes after now, with the
  // same rules as every other day. What is left may be too little for a
  // task; the day then becomes a quiet one that says so (below).
  // A date holds a task when its capacity and its longest free interval both clear the floor.
  const usable = (i: number) =>
    caps[i]!.capacity >= MIN_DAY_MINUTES && caps[i]!.intervals.some((iv) => iv.end - iv.start >= MIN_DAY_MINUTES)
  const builtLate = typeof input.startMinute === 'number' && Number.isFinite(input.startMinute) && caps[0] !== undefined
  // Whether the clock, not the diary, is what empties day 1 — the quiet day then says so.
  let emptiedByClock = false
  if (builtLate) {
    const wasUsable = usable(0)
    const from = Math.max(0, Math.round(input.startMinute!)) + START_GRACE_MINUTES
    const intervals = subtractIntervals(caps[0]!.intervals, [{ start: 0, end: from }])
    const raw = intervals.reduce((n, iv) => n + (iv.end - iv.start), 0)
    caps[0] = { ...caps[0]!, intervals, raw, capacity: Math.min(caps[0]!.stated, raw) }
    emptiedByClock = wasUsable && !usable(0)
  }
  const liveOn = (i: number) => subjects.filter((s) => dates[i]! < s.examDate)
  // The paper a subject is working towards on a date: the next one ahead. A subject with one paper has one answer.
  const activePaper = (i: number, s: Subject): PaperSitting => s.papers.find((p) => dates[i]! < p.examDate) ?? s.papers[s.papers.length - 1]!
  const daysToPaper = (i: number, s: Subject) => planLength(dates[i]!, activePaper(i, s).examDate)
  // Usable days from i (inclusive) to the paper. The taper is the last
  // TAPER_DAYS calendar days, or the last TAPER_DAYS usable days when the
  // calendar ones carry no capacity — so a paper on a Friday for a student
  // whose weekdays are off still gets its light last session, on the weekend.
  const usableSuffix = new Map<string, number[]>()
  const usableToPaper = (i: number, s: Subject): number => {
    const paperDate = activePaper(i, s).examDate
    const key = `${s.code}|${paperDate}`
    let suffix = usableSuffix.get(key)
    if (!suffix) {
      suffix = new Array<number>(length + 1).fill(0)
      for (let j = length - 1; j >= 0; j--) suffix[j] = suffix[j + 1]! + (dates[j]! < paperDate && usable(j) ? 1 : 0)
      usableSuffix.set(key, suffix)
    }
    return suffix[i] ?? 0
  }
  const tapering = (i: number, s: Subject) => daysToPaper(i, s) <= TAPER_DAYS || usableToPaper(i, s) <= TAPER_DAYS
  // 0 on the last usable day before the paper (the eve, or what stands in for it), 1 the day before, and so on.
  const taperPosition = (i: number, s: Subject) => Math.max(0, usableToPaper(i, s) - 1)
  // Review only from the first day after which every live subject is in a taper for good — the run-in to the last
  // papers, not the taper before a subject's first paper when a second one follows.
  let reviewFrom = length
  for (let i = length - 1; i >= 0; i--) {
    const live = liveOn(i)
    if (live.length > 0 && live.every((s) => tapering(i, s))) reviewFrom = i
    else break
  }

  // Weekly rest, as v2: the lightest day of each 7-day window, never day 1,
  // never in the taper, never an exam day, and only when the window has no
  // quiet day of its own.
  const restIndexes = new Set<number>()
  if (length >= 10) {
    for (let w = 0; w * 7 < reviewFrom; w++) {
      const lo = w * 7
      const hi = Math.min(reviewFrom, lo + 7)
      let best = -1
      let bestMin = Infinity
      let hasNatural = false
      for (let i = lo; i < hi; i++) {
        if (!usable(i) || examOn.has(dates[i]!)) {
          hasNatural = true
          continue
        }
        if (i === 0) continue
        const m = caps[i]!.capacity
        const weekend = weekdayIndex(dates[i]!) >= 5
        const bestWeekend = best >= 0 && weekdayIndex(dates[best]!) >= 5
        if (m < bestMin || (m === bestMin && (weekend || !bestWeekend))) {
          bestMin = m
          best = i
        }
      }
      if (!hasNatural && best >= 0 && hi - lo >= 5) restIndexes.add(best)
    }
  }
  const isStudy = (i: number) => usable(i) && !restIndexes.has(i) && liveOn(i).length > 0
  const studyDayIndexes = dates.map((_, i) => i).filter(isStudy)

  // --- d. the pools -------------------------------------------------------------------
  const states: SubjectState[] = subjects.map((s) => {
    const studyDays = studyDayIndexes.filter((i) => dates[i]! < s.examDate)
    const beforeTaper = studyDays.filter((i) => !tapering(i, s)).length
    // An empty signal list (a subject with no syllabus tree) is no list at all: the v2 lists stand in.
    const signals = (s.signals?.length ? s.signals : synthesiseSignals(s)).filter((sig) => papersFor(s, sig.paper).length > 0)
    const names = new Map(signals.map((sig) => [sig.code, sig.name]))
    const ctx: ScoreContext = {
      mode,
      // Scored against the nearest paper: it sets the urgency for the whole subject.
      daysToPaper: planLength(input.startDate, s.papers[0]!.examDate),
      planLength: length,
      studyDaysToPaper: beforeTaper,
      subjectLabel: s.label,
      board: s.board,
      component: s.component,
      examDate: s.papers[0]!.examDate,
      todayIso: input.startDate,
    }
    const selfRating = s.selfRating ?? input.selfRatings?.[s.code]
    return {
      subject: s,
      selfRating,
      pool: rankSubjectTopics(signals, selfRating, ctx, { nameOf: (c) => names.get(c) }),
      paperOf: new Map(signals.map((sig) => [sig.code, sig.paper])),
      dest: s.destinations ?? null,
      loops: new Map(),
      open: [],
      placed: new Set(),
      proved: new Set(),
      dropped: new Set(),
      pending: [],
      studyDays,
      lastTouched: -1,
      workMinutes: 0,
      taperReviewed: new Set(),
      taperReviewedOn: -1,
      taperPrev: new Set(),
    }
  })
  const pools: Record<string, TopicPriority[]> = {}
  for (const st of states) pools[st.subject.code] = st.pool
  // A topic is live on a date while a paper it is on still lies ahead: a Paper 1 topic is not scheduled after Paper 1 has been sat.
  const topicLive = (st: SubjectState, code: string, i: number): boolean => {
    const s = st.subject
    if (s.papers.length <= 1) return dates[i]! < s.examDate
    return papersFor(s, st.paperOf.get(code)).some((p) => dates[i]! < p.examDate)
  }
  // The one paper a topic is for, when the subject sits several and the leaf is tagged for exactly one; the card and a carry-over read it.
  const componentFor = (st: SubjectState, code: string): string | undefined => {
    if (st.subject.papers.length <= 1) return undefined
    const on = papersFor(st.subject, st.paperOf.get(code))
    return on.length === 1 ? on[0]!.component : undefined
  }
  const priorityIndex = (st: SubjectState) => (input.prioritySubject && st.subject.code === input.prioritySubject ? 0 : 1)

  const topicOf = (st: SubjectState, code: string, name: string): PlanTopic => {
    const s = st.subject
    return (
      s.weak.find((t) => t.code === code) ??
      s.highYield.find((t) => t.code === code) ??
      s.syllabus?.find((t) => t.code === code) ?? { code, name, source: 'syllabus', weight: 0 }
    )
  }

  // --- f. timed papers ----------------------------------------------------------------
  // The fit on a date: the whole paper when the capacity and one free interval
  // hold it; the first N minutes when N is at least half of it (and never
  // under the paper floor); otherwise nothing, and the loops' timed sets carry the mode's timed share.
  // A sitting needs its marking allowance in hand after it: the block is the
  // paper, and the day keeps at least paperMarkingMinutes(full) unlaid.
  type PaperFit = { minutes: number; full: number; slot: Interval; marking: number }
  const paperFit = (i: number, s: Subject): PaperFit | null => {
    const full = activePaper(i, s).paperMinutes ?? s.paperMinutes ?? TIMED_PAPER_MIN
    const marking = paperMarkingMinutes(full)
    const cap = caps[i]!
    const longest = cap.intervals.reduce((n, iv) => Math.max(n, iv.end - iv.start), 0)
    const minutes = Math.min(full, cap.capacity - marking, longest)
    if (minutes < full && minutes < Math.max(MIN_TASK_MINUTES.timed_paper, 0.5 * full)) return null
    const r = reservePaperSlot(cap.intervals, minutes)
    return r ? { minutes, full, slot: r.slot, marking } : null
  }
  const paperDays = new Map<number, { st: SubjectState; fit: PaperFit }>()
  const paperSubjects = states.filter((st) => st.subject.hasTimedPaper)
  if (session >= TIMED_PAPER_MIN_SESSION && paperSubjects.length > 0 && studyDayIndexes.length > 1) {
    const budgetDays = studyDayIndexes.filter((i) => i < reviewFrom)
    const averageCapacity = budgetDays.length > 0 ? budgetDays.reduce((n, i) => n + caps[i]!.capacity, 0) / budgetDays.length : 0
    const budget = timedPaperBudget(mode, budgetDays.length, averageCapacity)
    const ownDays = (st: SubjectState) => st.studyDays.filter((i) => !tapering(i, st.subject) && !examOn.has(dates[i]!))
    const spans = paperSubjects.map((st) => ownDays(st).length)
    const spanTotal = spans.reduce((a, b) => a + b, 0)
    // A subject that is mostly weak sits no paper in the first third of its
    // study days: the loops need to have reached some marked questions first.
    // Polish trusts the student's word and sits papers from day two.
    const earliestPaperDay = (st: SubjectState): number => {
      if (mode === 'polish') return 0
      const must = st.pool.filter((t) => t.band === 'must')
      const weakShare = must.length > 0 ? must.filter((t) => t.loop === 'weak').length / must.length : 0
      return weakShare >= PAPERS_WAIT_WHEN_WEAK_SHARE ? Math.floor(ownDays(st).length / 3) : 0
    }
    // One merged pass over every subject's wanted sittings, earliest first,
    // so two subjects' papers never land on consecutive study days: a
    // wanted day whose neighbour (either side, any subject) already holds a
    // paper moves to the nearest free day that has none; only when no such
    // day exists does the adjacency rule give way.
    const ordinalOf = new Map(studyDayIndexes.map((i, k) => [i, k]))
    const paperOrdinals = new Set<number>()
    const wanted: Array<{ st: SubjectState; eligible: Array<{ i: number; fit: PaperFit }>; pos: number }> = []
    paperSubjects.forEach((st, si) => {
      const share = spanTotal > 0 && spans[si]! > 0 ? Math.max(1, Math.round((budget * spans[si]!) / spanTotal)) : 0
      const from = earliestPaperDay(st)
      const eligible = ownDays(st)
        .filter((i, k) => i !== studyDayIndexes[0] && k >= from)
        .map((i) => ({ i, fit: paperFit(i, st.subject) }))
        .filter((e): e is { i: number; fit: PaperFit } => e.fit !== null)
      if (share === 0 || budget === 0 || eligible.length === 0) return
      const count = Math.min(share, eligible.length)
      const step = eligible.length / count
      for (let k = 0; k < count; k++) wanted.push({ st, eligible, pos: Math.min(eligible.length - 1, Math.floor((k + 0.5) * step)) })
    })
    wanted.sort((a, b) => a.eligible[a.pos]!.i - b.eligible[b.pos]!.i || states.indexOf(a.st) - states.indexOf(b.st))
    const clear = (i: number, strict: boolean) => {
      if (paperDays.has(i)) return false
      const o = ordinalOf.get(i)
      if (!strict || o === undefined) return true
      return !paperOrdinals.has(o - 1) && !paperOrdinals.has(o + 1)
    }
    // The eligible position nearest the wanted one that is clear; -1 when none is.
    const nearestClear = (w: (typeof wanted)[number], strict: boolean): number => {
      for (let d = 0; d < w.eligible.length; d++) {
        for (const p of [w.pos + d, w.pos - d]) {
          if (p < 0 || p >= w.eligible.length) continue
          if (clear(w.eligible[p]!.i, strict)) return p
        }
      }
      return -1
    }
    const placedPapers: Array<{ w: (typeof wanted)[number]; i: number }> = []
    const put = (w: (typeof wanted)[number], p: number) => {
      const { i, fit } = w.eligible[p]!
      paperDays.set(i, { st: w.st, fit })
      const o = ordinalOf.get(i)
      if (o !== undefined) paperOrdinals.add(o)
      placedPapers.push({ w, i })
    }
    const lift = (entry: { w: (typeof wanted)[number]; i: number }) => {
      paperDays.delete(entry.i)
      const o = ordinalOf.get(entry.i)
      if (o !== undefined) paperOrdinals.delete(o)
      placedPapers.splice(placedPapers.indexOf(entry), 1)
    }
    for (const w of wanted) {
      const p = nearestClear(w, true) >= 0 ? nearestClear(w, true) : nearestClear(w, false)
      if (p >= 0) put(w, p)
    }
    // Repair: a paper that ended up beside another moves to the nearest
    // eligible day that is clear once it has left, when one exists (the
    // first subject to want a day is not the one that should have to move).
    for (let round = 0; round < 3; round++) {
      let moved = false
      for (const entry of [...placedPapers]) {
        const o = ordinalOf.get(entry.i)
        if (o === undefined || (!paperOrdinals.has(o - 1) && !paperOrdinals.has(o + 1))) continue
        lift(entry)
        const p = nearestClear(entry.w, true)
        if (p >= 0) {
          put(entry.w, p)
          moved = true
        } else {
          put(entry.w, entry.w.eligible.findIndex((e) => e.i === entry.i))
        }
      }
      if (!moved) break
    }
  }

  // --- g. the days --------------------------------------------------------------------
  const days: PlanDay[] = []
  let ordinal = 0
  let totalWork = 0
  let supply = 0
  let capacitySum = 0
  let laidSum = 0
  let paperDayWithoutBuffer = false
  /** Set when day 1 was emptied by the clock; its focus is written once tomorrow's first task is known. */
  let builtLateDay: PlanDay | null = null

  const examDayLine = (examsOn: ExamOn[]) => `${examsOn.map(examName).join(' and ')} exam today. Nothing else is scheduled.`
  const quietDayLine = (i: number): string => {
    const date = dates[i]!
    if (blocked.has(date)) return "Rest day — you told us you're away."
    // Stated minutes of zero for this kind of day: the student's week, not a full diary.
    if (caps[i]!.stated === 0) return `No study today — ${weekdayIndex(date) >= 5 ? 'weekends' : 'weekdays'} are off in your plan.`
    return 'Rest day — you told us this one is full.'
  }

  const restDayV3 = (i: number, kind: PlanDay['kind'], focus: string): PlanDay => ({
    day: i + 1,
    date: dates[i]!,
    daysLeft: length - i,
    kind,
    focus,
    blocks: [
      {
        kind: 'rest',
        minutes: 0,
        label: focus,
        id: taskIdFor(dates[i]!, undefined, 'rest', 1),
        taskType: 'rest',
        category: TASK_CATEGORY.rest,
        objective: focus,
        why: [],
        priority: 0,
      },
    ],
    workMinutes: 0,
    capacityMinutes: 0,
    bufferMinutes: 0,
    commitments: caps[i]!.commitments,
    windows: [],
  })

  for (let i = 0; i < length; i++) {
    const date = dates[i]!
    const cap = caps[i]!
    const examsToday = examOn.get(date)
    const live = liveOn(i)

    if (!isStudy(i)) {
      if (examsToday) {
        days.push(restDayV3(i, 'exam', examDayLine(examsToday)))
      } else if (live.length === 0) {
        days.push(restDayV3(i, 'rest', 'Rest day.'))
      } else if (restIndexes.has(i)) {
        days.push(restDayV3(i, 'rest', 'Rest day. The plan is built to hold without it.'))
      } else if (i === 0 && emptiedByClock) {
        // The clock, not the diary, emptied day 1: say so, and what tomorrow opens with (filled in once known).
        builtLateDay = restDayV3(i, 'rest', BUILT_LATE_FRESH)
        days.push(builtLateDay)
      } else {
        days.push(restDayV3(i, 'rest', quietDayLine(i)))
      }
      continue
    }

    const today = ordinal
    ordinal += 1
    capacitySum += cap.capacity
    const reviewOnlyDay = Boolean(examsToday) || i >= reviewFrom
    const counters = new Map<string, number>()
    const tasks: PlacedTask[] = []
    const breakSlots: DaySlot[] = []
    const queue: Slot[] = []
    let unallocated = 0

    const place = (
      st: SubjectState | null,
      slot: Slot,
      type: TaskType,
      minutes: number,
      extra: { topic?: PlanTopic; why?: EvidenceItem[]; priority?: number; loopStep?: LoopStep; provisional?: boolean; label?: string; fresh?: boolean; component?: string }
    ): PlanBlock => {
      const key = extra.topic?.code ?? type
      const component = extra.component ?? (st && extra.topic ? componentFor(st, extra.topic.code) : undefined)
      const tupleKey = `${st?.subject.code ?? 'x'}|${key}`
      const n = (counters.get(tupleKey) ?? 0) + 1
      counters.set(tupleKey, n)
      const objective =
        extra.label ??
        objectiveFor(type, { topic: extra.topic?.name, subject: st?.subject.label ?? '', minutes, board: st?.subject.board, fresh: extra.fresh })
      const block: PlanBlock = {
        kind: TASK_KIND[type],
        minutes,
        subjectCode: st?.subject.code,
        subjectLabel: st?.subject.label,
        topic: extra.topic,
        label: objective,
        id: taskIdFor(date, st?.subject.code, key, n),
        taskType: type,
        category: TASK_CATEGORY[type],
        objective,
        why: (extra.why ?? []).map((w) => ({ ...w })),
        priority: extra.priority ?? 0,
        loopStep: extra.loopStep,
        provisional: extra.provisional || undefined,
        startsAt: clockOf(slot.start),
        endsAt: clockOf(slot.start + minutes),
        ...(component ? { component } : {}),
      }
      tasks.push({ block, start: slot.start, end: slot.start + minutes })
      if (WORK_KINDS.has(block.kind) && st) {
        st.workMinutes += minutes
        st.lastTouched = today
      }
      return block
    }

    // The slot's leftover after a task: another slot when it can hold one, time in hand otherwise.
    const consume = (slot: Slot, minutes: number) => {
      const left = slot.end - (slot.start + minutes)
      if (left >= MIN_DAY_MINUTES) queue.unshift({ start: slot.start + minutes, end: slot.end, minutes: left, leftover: true })
      else unallocated += left
    }

    const paper = paperDays.get(i)
    // What the ordinary fill lays into: the whole day, or what a timed paper
    // leaves of it once the sitting, its marking allowance, the break and the
    // review are taken out. Before the second pass a paper day stopped there,
    // which on a six-hour day left four hours in hand.
    let fillIntervals: Interval[] = cap.intervals
    let fillCapacity = cap.capacity
    if (paper) {
      // The paper takes its slot whole, outside the utilisation cap; a long
      // break and one error review follow when the interval and the capacity hold them.
      const { st, fit } = paper
      const paperSlot: Slot = { start: fit.slot.start, end: fit.slot.end, minutes: fit.minutes }
      // The sitting this practice is for: "Timed Business Paper 1" when the subject sits several, "Timed Business paper" otherwise.
      const sitting = activePaper(i, st.subject)
      const paperName = st.subject.papers.length > 1 && sitting.component ? `${st.subject.label} ${sitting.component}` : `${st.subject.label} paper`
      const label =
        fit.minutes < fit.full
          ? `Timed ${paperName} — the first ${fit.minutes} min of a ${fit.full}-min paper, no notes; mark it in the ${fit.marking} min kept in hand after.`
          : `Timed ${paperName} — ${fit.minutes} min, no notes; mark it in the ${fit.marking} min kept in hand after.`
      const sittings = [...paperDays.values()].filter((p) => p.st === st).length
      const paperWhy: EvidenceItem[] = [
        {
          type: 'mode',
          source: 'plan',
          confidence: 'medium',
          explanation: `Your plan style puts about ${Math.round(weights.timedShare * 100)}% of study minutes under time; this is one of ${sittings} timed ${sittings === 1 ? 'sitting' : 'sittings'} for ${st.subject.label}.`,
        },
      ]
      place(st, paperSlot, 'timed_paper', fit.minutes, { label, why: paperWhy, priority: st.pool[0]?.score ?? 0, component: st.subject.papers.length > 1 ? sitting.component : undefined })
      supply += fit.minutes
      const longBreak = BREAK_MINUTES[rhythm].long
      const host = intervalAt(cap.intervals, fit.slot.end - 1)
      const errMin = stepMinutesFor('error_review', scale)
      const room = host ? host.end - fit.slot.end : 0
      const capLeft = cap.capacity - fit.minutes - fit.marking
      // Where the sitting (and its review) ends, and what it cost of the day's capacity, marking allowance included.
      let usedEnd = fit.slot.end
      let spent = fit.minutes + fit.marking
      if (room >= longBreak + MIN_TASK_MINUTES.error_review && capLeft >= longBreak + MIN_TASK_MINUTES.error_review) {
        breakSlots.push({ kind: 'break', start: fit.slot.end, end: fit.slot.end + longBreak, minutes: longBreak })
        const start = fit.slot.end + longBreak
        const minutes = Math.min(errMin, room - longBreak, capLeft - longBreak)
        // The review is of the paper just sat, not of whichever topic happened to open last (which may have no marked answer yet).
        place(st, { start, end: start + minutes, minutes }, 'error_review', minutes, {
          label: objectiveFor('error_review', { subject: st.subject.label, minutes, afterPaper: true }),
          why: paperWhy,
          priority: st.pool[0]?.score ?? 0,
          component: st.subject.papers.length > 1 ? sitting.component : undefined,
        })
        supply += minutes
        usedEnd = start + minutes
        spent += longBreak + minutes
      }
      fillIntervals = subtractIntervals(cap.intervals, [{ start: fit.slot.start, end: usedEnd }])
      fillCapacity = Math.max(0, cap.capacity - spent)
    }
    // A paper day with nothing usable left, or a day too short for a task, lays nothing more.
    const canFill = fillCapacity >= MIN_DAY_MINUTES && fillIntervals.some((iv) => iv.end - iv.start >= MIN_DAY_MINUTES)
    if (canFill) {
      const layout = layoutDay(fillIntervals, fillCapacity, session, rhythm)
      for (const s of layout.slots) {
        if (s.kind === 'work') queue.push({ start: s.start, end: s.end, minutes: s.minutes })
        else if (s.kind === 'break') breakSlots.push(s)
      }
      supply += layout.workMinutes

      // Subjects today: a subject untouched for SUBJECT_TOUCH_EVERY_STUDY_DAYS
      // study days leads whatever else is due, then a due review jumps the
      // queue, then the least recently touched, the priority subject on
      // ties. The first subjectsPerDay are the day's focus; the others may
      // still take a slot the focus subjects cannot fill.
      const subjectOrdinal = (st: SubjectState) => st.studyDays.indexOf(i)
      const hasDue = (st: SubjectState) => st.pending.some((p) => p.dueOrdinal <= subjectOrdinal(st) && p.loop.next >= p.loop.steps.length)
      // Overdue: no task in the last SUBJECT_TOUCH_EVERY_STUDY_DAYS study days (a subject never touched counts from day one).
      const overdue = (st: SubjectState) => (st.lastTouched < 0 ? today : today - st.lastTouched) >= SUBJECT_TOUCH_EVERY_STUDY_DAYS
      const liveStates = states.filter((st) => live.includes(st.subject))
      const ranked = [...liveStates].sort(
        (a, b) =>
          Number(overdue(b)) - Number(overdue(a)) ||
          Number(hasDue(b)) - Number(hasDue(a)) ||
          a.lastTouched - b.lastTouched ||
          priorityIndex(a) - priorityIndex(b) ||
          states.indexOf(a) - states.indexOf(b)
      )
      const active = ranked.slice(0, subjectsPerDay(cap.capacity))
      const others = ranked.slice(active.length)
      const reviewedToday = new Map<SubjectState, Set<string>>()
      const reviewMinutes = new Map<SubjectState, number>()
      const mixedToday = new Map<SubjectState, number>()
      const openedToday = new Map<SubjectState, number>()
      const dayWork = layout.workMinutes
      // How much review a review-only day holds for one subject. The evening
      // of another subject's paper: one short review, only if the student
      // feels like it. The last study day before its own paper: EVE_REVIEW
      // minutes and cards whatever the session; the day before that: one
      // session. Anything else review-only (there is nothing else) keeps the
      // old two-session bound.
      const reviewCapFor = (st: SubjectState): { minutes: number; tasks: number } => {
        if (examsToday) return { minutes: stepMinutesFor('review', scale), tasks: 1 }
        if (tapering(i, st.subject)) {
          const pos = taperPosition(i, st.subject)
          if (pos === 0) return { minutes: EVE_REVIEW_MINUTES, tasks: EVE_REVIEW_TASKS }
          if (pos === 1) return { minutes: session, tasks: Number.POSITIVE_INFINITY }
        }
        return { minutes: TAPER_SESSIONS * session, tasks: Number.POSITIVE_INFINITY }
      }

      // The next spaced review, `gap` study days on: walked back to the last
      // day before the subject's taper (a review lands at least two days
      // before the paper; inside the taper the taper's own review covers it),
      // and dropped when no such day is left.
      const scheduleSpaced = (st: SubjectState, loop: TopicLoop, fromOrdinal: number, step: Step, gap: number) => {
        const last = st.studyDays.length - 1
        let due = Math.min(fromOrdinal + Math.max(1, gap), last)
        while (due > fromOrdinal && (tapering(st.studyDays[due]!, st.subject) || !topicLive(st, loop.entry.code, st.studyDays[due]!))) due -= 1
        if (due <= fromOrdinal) return
        st.pending.push({ loop, dueOrdinal: due, step, gap: due - fromOrdinal })
      }

      // The one honest line a review may fall back on: the leaf is on the syllabus for a paper the student
      // sits. Same template buildWhy opens with, so a fresh taper review reads like every other card's first line.
      const syllabusLine = (st: SubjectState, code: string): EvidenceItem =>
        syllabusOnlyWhy(st.subject.label, st.subject.board, st.paperOf.get(code))[0]!

      // The day's capacity, read before pick() shadows `cap` with the review cap.
      const capacityToday = cap.capacity
      const pick = (st: SubjectState, slot: Slot): boolean => {
        const subjOrd = subjectOrdinal(st)
        const subjectReviewOnly = reviewOnlyDay || tapering(i, st.subject)
        const done = reviewedToday.get(st) ?? new Set<string>()
        reviewedToday.set(st, done)
        const rMin = reviewMinutes.get(st) ?? 0
        const cap = reviewCapFor(st)
        const underCap = rMin + MIN_TASK_MINUTES.review <= cap.minutes && done.size < cap.tasks
        // Taper rotation: what this subject reviewed on its previous review-only day waits while other topics remain.
        const taperSkip = (): ReadonlySet<string> => (st.taperReviewedOn === i ? st.taperPrev : st.taperReviewed)
        const taperMark = (code: string) => {
          if (st.taperReviewedOn !== i) {
            st.taperPrev = st.taperReviewed
            st.taperReviewed = new Set()
            st.taperReviewedOn = i
          }
          st.taperReviewed.add(code)
        }

        // 1. A spaced review that is due (its loop finished), oldest first.
        // Reviews due today respect the mode's review share; an overdue one never waits.
        const due = st.pending
          .filter((p) => p.dueOrdinal <= subjOrd && p.loop.next >= p.loop.steps.length && !done.has(p.loop.entry.code) && topicLive(st, p.loop.entry.code, i))
          .filter((p) => MIN_TASK_MINUTES[p.step.taskType] <= slot.minutes)
          .filter((p) => subjectReviewOnly || p.dueOrdinal < subjOrd || rMin < weights.reviewShare * dayWork || rMin === 0)
          .sort((a, b) => a.dueOrdinal - b.dueOrdinal)[0]
        if (due && (!subjectReviewOnly || underCap)) {
          st.pending.splice(st.pending.indexOf(due), 1)
          // In a taper every task is a retrieval review, whatever the loop's own last step was.
          const type: TaskType = subjectReviewOnly ? 'review' : due.step.taskType
          const minutes = Math.min(slot.minutes, stepMinutesFor(type, scale))
          const entry = due.loop.entry
          place(st, slot, type, minutes, {
            topic: topicOf(st, entry.code, entry.name),
            why: due.loop.why.length > 0 ? due.loop.why : [syllabusLine(st, entry.code)],
            priority: entry.score,
            loopStep: subjectReviewOnly ? 'review' : due.step.step,
            provisional: due.step.provisional,
          })
          consume(slot, minutes)
          done.add(entry.code)
          if (subjectReviewOnly) taperMark(entry.code)
          reviewMinutes.set(st, rMin + minutes)
          due.loop.reviews += 1
          due.loop.lastSeenOrdinal = today
          // Reviews keep coming, at gaps that double up to REVIEW_GAP_MAX_STUDY_DAYS.
          scheduleSpaced(
            st,
            due.loop,
            subjOrd,
            { step: 'review', taskType: 'review', provisional: due.step.provisional },
            Math.min(2 * due.gap, REVIEW_GAP_MAX_STUDY_DAYS)
          )
          return true
        }

        // 2. Review only: retrieval on what was proved, weakest first, then
        // the most recently proved; a topic reviewed on the previous
        // review-only day waits while others remain, so the eve is not a
        // copy of the day before. In the subject's own taper any pool topic
        // may come back; after another subject's paper only a proved one
        // does, so no topic is reviewed before it starts.
        if (subjectReviewOnly) {
          const inTaper = tapering(i, st.subject)
          if (!underCap || MIN_TASK_MINUTES.review > slot.minutes) return false
          const skip = taperSkip()
          const proved = st.open
            .filter((l) => st.proved.has(l.entry.code) && !done.has(l.entry.code) && topicLive(st, l.entry.code, i))
            .sort((a, b) => a.entry.mastery - b.entry.mastery || (b.provedOrdinal ?? -1) - (a.provedOrdinal ?? -1))
          const rotated = proved.filter((l) => !skip.has(l.entry.code))
          const firstOf = (list: TopicPriority[]) => {
            const alive = list.filter((t) => topicLive(st, t.code, i))
            return alive.find((t) => !done.has(t.code) && !skip.has(t.code)) ?? alive.find((t) => !done.has(t.code))
          }
          // In the taper: what was proved, then what the student has marked before, then the rest of the pool.
          const worked = inTaper ? firstOf(st.pool.filter((t) => t.uncertainty < 1)) : undefined
          const candidate = (rotated[0] ?? proved[0])?.entry ?? worked ?? (inTaper ? firstOf(st.pool) : undefined)
          const minutes = Math.min(slot.minutes, stepMinutesFor('review', scale))
          if (!candidate && !inTaper) return false
          if (candidate) {
            const loop = st.loops.get(candidate.code)
            // A topic with no marked answer and no loop cannot "compare with your marked answer".
            const fresh = !loop && candidate.uncertainty >= 1
            const why = fresh ? candidate.why.filter((w) => w.type === 'on_syllabus') : (loop?.why ?? candidate.why)
            place(st, slot, 'review', minutes, {
              topic: topicOf(st, candidate.code, candidate.name),
              why: why.length > 0 ? why : [syllabusLine(st, candidate.code)],
              priority: candidate.score,
              loopStep: 'review',
              fresh,
            })
            done.add(candidate.code)
            taperMark(candidate.code)
            if (loop) loop.lastSeenOrdinal = today
          } else {
            if (done.has('*')) return false
            place(st, slot, 'review', minutes, { priority: 0 })
            done.add('*')
          }
          consume(slot, minutes)
          reviewMinutes.set(st, rMin + minutes)
          return true
        }

        // 3. The next step of an open loop, respecting the gaps between steps.
        // Foundation finishes a repaired topic before it opens another — the
        // hold applies while that topic can still move today; once its next
        // step waits for tomorrow, holding would only empty the day.
        const foundationHold =
          mode === 'foundation' &&
          st.open.some(
            (l) =>
              l.next < l.steps.length &&
              (l.lastStep === 'repair' || l.lastStep === 'recall') &&
              gapAllows(l.lastStep, l.steps[l.next]!.step, l.lastOrdinal, today)
          )
        const firstGap = () => reviewGapDays(null, daysToPaper(i, st.subject))
        for (const loop of st.open) {
          if (loop.next >= loop.steps.length) continue
          if (!topicLive(st, loop.entry.code, i)) continue
          const step = loop.steps[loop.next]!
          if (!gapAllows(loop.lastStep, step.step, loop.lastOrdinal, today)) continue
          // A timed set that no slot today can hold proves with one question instead of waiting for a day that never comes.
          const type = fitStep(step.taskType, slot.minutes)
          if (MIN_TASK_MINUTES[type] > slot.minutes) continue
          const minutes = Math.min(slot.minutes, stepMinutesFor(type, scale))
          place(st, slot, type, minutes, {
            topic: topicOf(st, loop.entry.code, loop.entry.name),
            why: loop.why,
            priority: loop.entry.score,
            loopStep: step.step,
            provisional: step.provisional,
          })
          consume(slot, minutes)
          loop.next += 1
          loop.lastStep = step.step
          loop.lastOrdinal = today
          if (step.step === 'prove') {
            st.proved.add(loop.entry.code)
            loop.provedOrdinal = today
            loop.lastSeenOrdinal = today
          }
          if (loop.next >= loop.steps.length) scheduleSpaced(st, loop, subjOrd, loop.spaced, firstGap())
          return true
        }
        if (foundationHold) return false

        // 4. A new topic, by score, when its loop can still finish before the
        // taper, in any slot its first step fits — a leftover ten minutes
        // included. An open loop whose next step could still run today
        // loses nothing by this: step 3 gives it the next slot before any
        // new topic is considered. What a leftover must not do is fragment
        // the day into five topics, so a subject opens at most
        // MAX_OPENINGS_PER_DAY a day; Foundation opens one while any loop
        // is open. (The first shape refused any slot shorter than a session
        // while a loop waited for tomorrow, which with one subject left half
        // of every day in hand next to "31 topics left for later".)
        const waiting = st.open.some((l) => l.next < l.steps.length)
        const opened = openedToday.get(st) ?? 0
        // At the cap the subject opens nothing more today, but a full session need not go idle: named mixed practice
        // (step 5) may still take it. A bare set is not offered at the cap — before anything is proved, "recent
        // topics" would be a fiction — so a capped day one stays honest and a capped day five stays full.
        const capped = opened >= openingsCapFor(capacityToday, mode, waiting)
        // Study days a topic still has: before the subject's taper, and only while a paper the topic is on lies ahead.
        const daysLeftFor = (code: string) => st.studyDays.filter((j) => j >= i && !tapering(j, st.subject) && topicLive(st, code, j)).length
        for (const entry of capped ? [] : eligibleTopics(st.pool, st.placed, st.dropped)) {
          if (!topicLive(st, entry.code, i)) continue
          let loop = st.loops.get(entry.code)
          if (!loop) {
            const built = loopStepsFor(entry, st.dest, { sessionLength: session, selfRating: st.selfRating })
            if (!built) {
              st.dropped.add(entry.code)
              continue
            }
            loop = { entry, ...built, next: 0, reviews: 0 }
            st.loops.set(entry.code, loop)
          }
          if (loopDaysNeeded(loop.steps, 0) > daysLeftFor(entry.code)) continue
          const step = loop.steps[0]!
          const type = fitStep(step.taskType, slot.minutes)
          if (MIN_TASK_MINUTES[type] > slot.minutes) continue
          const minutes = Math.min(slot.minutes, stepMinutesFor(type, scale))
          st.open.push(loop)
          st.placed.add(entry.code)
          openedToday.set(st, (openedToday.get(st) ?? 0) + 1)
          place(st, slot, type, minutes, {
            topic: topicOf(st, entry.code, entry.name),
            why: loop.why,
            priority: entry.score,
            loopStep: step.step,
            provisional: step.provisional,
          })
          consume(slot, minutes)
          loop.next = 1
          loop.lastStep = step.step
          loop.lastOrdinal = today
          if (step.step === 'prove') {
            st.proved.add(entry.code)
            loop.provedOrdinal = today
            loop.lastSeenOrdinal = today
          }
          if (loop.next >= loop.steps.length) scheduleSpaced(st, loop, subjOrd, loop.spaced, firstGap())
          return true
        }

        // 5. Mixed practice, when nothing can move or open today. Named after
        // the proved topics longest since their last review (up to three), so
        // the set rotates through what was learned and the card carries their
        // reasons; a bare set only while fewer than two topics are proved, or
        // the subject has no topic index at all.
        const mixed = mixedToday.get(st) ?? 0
        if (mixed < mixedCapFor(capacityToday) && MIN_TASK_MINUTES.mixed <= slot.minutes) {
          // A mixed set fills its session rather than leaving the day half empty.
          const minutes = Math.min(slot.minutes, Math.max(stepMinutesFor('mixed', scale), session))
          const lastSeen = (l: TopicLoop) => l.lastSeenOrdinal ?? l.provedOrdinal ?? -1
          const focus = st.open
            .filter((l) => st.proved.has(l.entry.code) && topicLive(st, l.entry.code, i))
            .sort((a, b) => lastSeen(a) - lastSeen(b) || a.entry.mastery - b.entry.mastery)
            .slice(0, MIXED_FOCUS_TOPICS)
          if (focus.length < 2 && capped) return false
          if (focus.length >= 2) {
            // Each topic's most specific line: its own marks or its paper count before the shared self-rating or syllabus lines.
            const why: EvidenceItem[] = []
            for (const l of focus) {
              const rank = (t: EvidenceItem['type']) => (MIXED_WHY_RANK.includes(t) ? MIXED_WHY_RANK.indexOf(t) : MIXED_WHY_RANK.length)
              const w = [...l.why].sort((a, b) => rank(a.type) - rank(b.type))[0]
              if (w && !why.some((x) => x.explanation === w.explanation) && why.length < 3) why.push({ ...w })
            }
            if (why.length < 3) why.push({ type: 'mode', source: 'plan', confidence: 'low', explanation: MIXED_WHY_LINE })
            const label = objectiveFor('mixed', { subject: st.subject.label, minutes, topics: focus.map((l) => l.entry.name) })
            place(st, slot, 'mixed', minutes, { label, why, priority: focus[0]!.entry.score })
            for (const l of focus) l.lastSeenOrdinal = today
          } else {
            const why: EvidenceItem[] = [
              { type: 'mode', source: 'plan', confidence: 'low', explanation: st.pool.length === 0 ? NO_TOPIC_INDEX_LINE : MIXED_WHY_LINE },
            ]
            place(st, slot, 'mixed', minutes, { why, priority: 0 })
          }
          consume(slot, minutes)
          mixedToday.set(st, mixed + 1)
          return true
        }
        return false
      }

      // Consecutive sessions stay on one subject, and a session's leftover
      // stays with the subject that just used it; a focus subject that cannot
      // fill a slot hands it on, then to the other live subjects; a slot
      // nobody fills is time in hand.
      let si = 0
      let run = 0
      const perRun = Math.max(1, Math.ceil(queue.length / Math.max(1, active.length)))
      while (queue.length > 0) {
        const slot = queue.shift()!
        let placed = false
        // A subject overdue for a touch takes any slot it can fill — a leftover included — before the day's focus subjects.
        for (const st of ranked) {
          if (placed || !overdue(st) || st.lastTouched === today) continue
          placed = pick(st, slot)
        }
        for (let tried = 0; tried < active.length && !placed; tried++) {
          const st = active[si]!
          if (pick(st, slot)) {
            placed = true
            if (!slot.leftover) run += 1
            if (run >= perRun && !queue[0]?.leftover) {
              si = (si + 1) % active.length
              run = 0
            }
          } else {
            si = (si + 1) % active.length
            run = 0
          }
        }
        for (const st of others) {
          if (placed) break
          placed = pick(st, slot)
        }
        if (!placed) unallocated += slot.minutes
      }
    }

    // --- j. the day's blocks ------------------------------------------------------
    tasks.sort((a, b) => a.start - b.start)
    const keptBreaks = breakSlots.filter((b) => {
      const iv = intervalAt(cap.intervals, b.start)
      if (!iv) return false
      const before = tasks.some((t) => t.end <= b.start && t.start >= iv.start)
      const after = tasks.some((t) => t.start >= b.end && t.end <= iv.end)
      return before && after
    })
    const work = tasks.reduce((n, t) => n + (WORK_KINDS.has(t.block.kind) ? t.block.minutes : 0), 0)
    const breakMinutes = keptBreaks.reduce((n, b) => n + b.minutes, 0)
    const bufferMinutes = Math.max(0, cap.capacity - work - breakMinutes)
    void unallocated
    const blocks: PlanBlock[] = [...tasks.map((t) => t.block)]
    keptBreaks.forEach((b, k) => {
      blocks.push({
        kind: 'break',
        minutes: b.minutes,
        label: `${b.minutes} min off`,
        id: taskIdFor(date, undefined, 'break', k + 1),
        taskType: 'break',
        category: TASK_CATEGORY.break,
        objective: `${b.minutes} min off`,
        why: [],
        priority: 0,
        startsAt: clockOf(b.start),
        endsAt: clockOf(b.end),
      })
    })
    if (bufferMinutes >= MIN_BUFFER_MINUTES) {
      const lastEnd = Math.max(0, ...tasks.map((t) => t.end), ...keptBreaks.map((b) => b.end))
      const host = intervalAt(cap.intervals, lastEnd) ?? cap.intervals.find((iv) => iv.start >= lastEnd)
      if (host) {
        const at = Math.max(host.start, lastEnd)
        const minutes = Math.min(bufferMinutes, host.end - at)
        if (minutes >= MIN_BUFFER_MINUTES) {
          blocks.push({
            kind: 'buffer',
            minutes,
            label: BUFFER_LABEL,
            id: taskIdFor(date, undefined, 'buffer', 1),
            taskType: 'buffer',
            category: TASK_CATEGORY.buffer,
            objective: BUFFER_LABEL,
            why: [],
            priority: 0,
            startsAt: clockOf(at),
            endsAt: clockOf(at + minutes),
          })
        }
      }
    }
    blocks.sort((a, b) => minuteOfDay(a.startsAt) - minuteOfDay(b.startsAt))
    if (paper && bufferMinutes < MIN_BUFFER_MINUTES) paperDayWithoutBuffer = true

    if (tasks.length === 0) {
      days.push(restDayV3(i, examsToday ? 'exam' : 'rest', examsToday ? examDayLine(examsToday) : 'Rest day — nothing is due today.'))
      continue
    }

    totalWork += work
    laidSum += work + breakMinutes
    const kind: PlanDay['kind'] = examsToday ? 'exam' : i >= reviewFrom ? 'review' : 'study'
    const labelsOf = (pred: (t: PlacedTask) => boolean) => [...new Set(tasks.filter(pred).map((t) => t.block.subjectLabel).filter(Boolean))] as string[]
    const reviewLabels = labelsOf((t) => t.block.subjectCode !== undefined && tapering(i, subjects.find((s) => s.code === t.block.subjectCode)!))
    const workLabels = labelsOf((t) => t.block.subjectCode !== undefined && !reviewLabels.includes(t.block.subjectLabel!))
    // The subjects only: the card's own summary owns the task count, which
    // a defer or a skip changes while a built-time count would not.
    let focus: string
    if (kind === 'exam') {
      focus = `${examsToday!.map(examName).join(' and ')} exam today. One short ${[...workLabels, ...reviewLabels].join(' and ')} review after the paper — only if you feel like it.`
    } else if (kind === 'review') {
      focus = length - i === 1 ? 'Light review, then stop. Sleep is revision too.' : 'Review only — nothing new from here.'
    } else if (paper) {
      focus = `Timed paper day — ${paper.st.subject.label} under exam conditions.`
    } else if (workLabels.length > 0) {
      focus = `${workLabels.join(' and ')}${reviewLabels.length > 0 ? ` · ${reviewLabels.join(' and ')} review only` : ''}`
    } else {
      focus = `${reviewLabels.join(' and ')} — review only.`
    }
    days.push({
      day: i + 1,
      date,
      daysLeft: length - i,
      kind,
      focus,
      blocks,
      workMinutes: work,
      capacityMinutes: cap.capacity,
      bufferMinutes,
      commitments: cap.commitments,
      windows: cap.intervals.map((iv) => ({ start: clockOf(iv.start), end: clockOf(iv.end) })),
    })
  }

  // --- k. the plan ----------------------------------------------------------------------
  const feasibility = assessFeasibility({
    mode,
    sessionLength: session,
    supplyMinutes: supply,
    plannedMinutes: totalWork,
    capacityMinutes: capacitySum,
    laidMinutes: laidSum,
    studyDays: ordinal,
    subjects: states.map((st) => ({
      code: st.subject.code,
      label: st.subject.label,
      daysToPaper: planLength(input.startDate, st.subject.papers[0]!.examDate),
      studyDaysToPaper: st.studyDays.length,
      pool: st.pool,
      inTaper: tapering(0, st.subject),
      ...(st.subject.papers.length > 1
        ? { papers: st.subject.papers.map((p) => ({ component: p.component, examDate: p.examDate, daysToPaper: planLength(input.startDate, p.examDate) })) }
        : {}),
      prioritised: Boolean(input.prioritySubject) && st.subject.code === input.prioritySubject,
      // Reached means the marked question is on the calendar, not that a ten-minute check was.
      plannedTopics: st.proved.size,
      plannedMinutes: st.workMinutes,
      started: st.pool.filter((t) => st.placed.has(t.code) && !st.proved.has(t.code)).map((t) => t.name),
      later: st.pool.filter((t) => !st.placed.has(t.code)).map((t) => t.name),
    })),
  })
  if (paperDayWithoutBuffer) feasibility.tradeoffs.push('On a timed-paper day the paper takes the whole session, so nothing is left free that day.')

  // Day 1 emptied by the clock: now that tomorrow is laid, say what it opens with.
  if (builtLateDay) {
    const next = days.find((d) => d.day > 1 && d.workMinutes > 0)
    const first = next?.blocks.find((b) => WORK_KINDS.has(b.kind))
    if (next && first) {
      const objective = (first.objective ?? first.label).trim().replace(/[.]+$/, '')
      const when = next.day === 2 ? 'tomorrow' : 'your first study day'
      const line = `${BUILT_LATE_PREFIX} — ${when} starts with ${objective}.`
      builtLateDay.focus = line
      for (const b of builtLateDay.blocks) {
        b.label = line
        b.objective = line
      }
    }
  }

  const hours = Math.round((totalWork / 60) * 10) / 10
  const studyDayCount = days.filter((d) => d.workMinutes > 0).length
  const plan: StudyPlan = {
    ...shell,
    feasibility,
    days,
    totalWorkMinutes: totalWork,
    headline: planHeadline(length, hours, studyDayCount),
  }

  // --- l. validation ------------------------------------------------------------------
  if (opts.strict) {
    const errors = validateRoadmap(plan)
    if (errors.length > 0) throw new Error(`buildRoadmap produced an invalid plan:\n${errors.join('\n')}`)
  }
  return { plan, pools }
}

const WEAK_ORDER: LoopStep[] = ['diagnose', 'repair', 'recall', 'prove', 'review']
const STRONG_ORDER: LoopStep[] = ['diagnose', 'prove', 'review', 'recall', 'review']

/** True when the steps walk one of the loops forward (a step may repeat, never go back). */
function followsOrder(steps: LoopStep[], order: LoopStep[]): boolean {
  let pos = 0
  for (const s of steps) {
    const at = order.indexOf(s, pos)
    if (at < 0) return false
    pos = at
  }
  return true
}

/**
 * The invariants a built roadmap must hold. Empty means valid. Pure, so a
 * test can run it over every plan it builds and the route can refuse to
 * store one that breaks a rule.
 */
export function validateRoadmap(plan: Pick<StudyPlan, 'days' | 'subjects'>): string[] {
  const errors: string[] = []
  const examOf = new Map(plan.subjects.map((s) => [s.code, s.examDate]))
  const papersOf = new Map(plan.subjects.map((s) => [s.code, s.papers ?? []]))
  const stepsByTopic = new Map<string, Array<{ date: string; start: number; step: LoopStep }>>()

  for (const day of plan.days) {
    const timed = day.blocks
      .filter((b) => b.startsAt !== undefined)
      .map((b) => ({ b, start: minuteOfDay(b.startsAt), end: minuteOfDay(b.endsAt) }))
      .sort((a, b) => a.start - b.start)
    const windows = (day.windows ?? []).map((w) => ({ start: minuteOfDay(w.start), end: minuteOfDay(w.end) }))

    for (let k = 1; k < timed.length; k++) {
      if (timed[k]!.start < timed[k - 1]!.end) errors.push(`${day.date}: ${timed[k]!.b.id} overlaps ${timed[k - 1]!.b.id}`)
    }
    for (const t of timed) {
      if (!windows.some((w) => t.start >= w.start && t.end <= w.end)) errors.push(`${day.date}: ${t.b.id} is outside the day's windows`)
    }
    for (const w of windows) {
      const inside = timed.filter((t) => t.start >= w.start && t.end <= w.end && t.b.kind !== 'buffer')
      if (inside.length > 0 && (inside[0]!.b.kind === 'break' || inside[inside.length - 1]!.b.kind === 'break')) {
        errors.push(`${day.date}: a break sits at the edge of the ${w.start}-${w.end} window`)
      }
    }

    let work = 0
    for (const b of day.blocks) {
      if (WORK_KINDS.has(b.kind)) work += b.minutes
      if (!b.id || !b.taskType || !b.category || b.objective === undefined || !Array.isArray(b.why) || typeof b.priority !== 'number') {
        errors.push(`${day.date}: a block lacks id/taskType/category/objective/why/priority (${b.id ?? b.label})`)
        continue
      }
      if (WORK_KINDS.has(b.kind) && b.minutes < MIN_TASK_MINUTES[b.taskType]) {
        errors.push(`${day.date}: ${b.id} is ${b.minutes} min, under the ${b.taskType} floor`)
      }
      if (b.subjectCode) {
        const exam = examOf.get(b.subjectCode)
        if (exam !== undefined && !(day.date < exam)) errors.push(`${day.date}: ${b.id} falls on or after its paper (${exam})`)
        const paper = b.component ? papersOf.get(b.subjectCode)?.find((p) => p.component === b.component)?.examDate : undefined
        if (paper !== undefined && !(day.date < paper)) errors.push(`${day.date}: ${b.id} is for ${b.component} but falls on or after it (${paper})`)
      }
      if (b.loopStep && b.subjectCode && b.topic) {
        const key = `${b.subjectCode}|${b.topic.code}`
        const list = stepsByTopic.get(key) ?? []
        list.push({ date: day.date, start: minuteOfDay(b.startsAt), step: b.loopStep })
        stepsByTopic.set(key, list)
      }
    }
    if (work !== day.workMinutes) errors.push(`${day.date}: workMinutes ${day.workMinutes} but the work blocks sum to ${work}`)
  }

  for (const [key, list] of stepsByTopic) {
    const steps = list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.start - b.start)).map((s) => s.step)
    if (!followsOrder(steps, WEAK_ORDER) && !followsOrder(steps, STRONG_ORDER)) errors.push(`${key}: loop steps out of order (${steps.join(' → ')})`)
  }
  return errors
}
