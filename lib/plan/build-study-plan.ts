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
 */

import { examEncouragement } from '@/lib/dashboard/exam-date'

export type Preparedness = 'pass' | 'secure' | 'stretch'

/**
 * Bumped when a rebuild would give a student a materially better plan than
 * the one they have — a plan carrying an older version (or none) is offered
 * a rebuild, with its ticks carried over. History:
 *   1  first plans (single exam date, no syllabus rotation)
 *   2  syllabus rotation for subjects without frequency data, time zones,
 *      days away, per-subject exam dates, real paper lengths
 */
export const PLAN_VERSION = 2

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

export type PlanBlockKind = 'drill' | 'timed_paper' | 'review' | 'break' | 'rest'

export type PlanBlock = {
  kind: PlanBlockKind
  minutes: number
  /** Present for drill / review blocks. */
  subjectCode?: string
  subjectLabel?: string
  topic?: PlanTopic
  /** What the student actually does, in their words. */
  label: string
}

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
  /** Total minutes of work (breaks excluded). */
  workMinutes: number
}

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
  /** Each subject with the date of its own paper (the plan's when not set). */
  subjects: Array<{ code: string; label: string; examDate: string }>
  days: PlanDay[]
  /** Total scheduled work across the plan, for the summary line. */
  totalWorkMinutes: number
  /** Something true and encouraging for the top of the page. */
  headline: string
}

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
      const reason = `${names} exam today. Nothing else is scheduled — you've done the work.`
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
        blocks: work > 0 ? blocks : [{ kind: 'rest', minutes: 0, label: 'Rest. You have done the work.' }],
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
      days.push(restDay(dayNum, date, daysLeft, 'Rest day. The plan holds without it — and so will you.'))
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
    version: PLAN_VERSION,
    examDate,
    preparedness: input.preparedness,
    minutesPerDay,
    availability,
    blockedDates: [...blocked].sort(),
    timeZone,
    subjects: subjects.map((s) => ({ code: s.code, label: s.label, examDate: s.examDate })),
    days,
    totalWorkMinutes: totalWork,
    headline: `${length} day${length === 1 ? '' : 's'} to go. ${examEncouragement(length)} ${hours} focused hours across ${studyDayCount} days, breaks included.`,
  }
}
