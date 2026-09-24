/**
 * Whether the work fits the time, said plainly.
 *
 * A plan that silently schedules everything into days that cannot hold it
 * teaches the student that the plan is fiction by Wednesday. This module
 * compares what the mode wants (demand: a loop per topic, in the minutes
 * the cards will show) with what the days can hold (supply: work minutes
 * after layout, never capacity × a ratio) and returns one of three honest
 * states, the numbers behind it, the trade-offs in sentences and the
 * options the wizard offers.
 *
 * Two demands, measured differently on purpose. Full demand is the whole
 * pool's loop minutes — everything the mode would like — so a 40-topic
 * subject in a 30-day window is never "on track" by construction. Must
 * demand is admitted: a loop needs a few study days with its steps spaced
 * out, so a subject with two study days left cannot "demand" thirty
 * priority loops; only the priority loops that fit before the taper are
 * counted, and a subject inside its taper demands nothing here (the
 * scheduler adds its review). That is why a one-day plan is never "tight":
 * it is a review day, and the state says so.
 *
 * The state is a statement about the calendar, not about the arithmetic.
 * on_track means every topic's loop is on it. focused means the time
 * covers the priority loops and something waits — a topic left for later,
 * a priority topic the taper cut off, a topic opened whose marked question
 * never landed. tight means even the priority loops do not fit. The
 * headline follows the state and says only that; the card's rows own the
 * per-subject facts, so nothing here repeats them.
 *
 * Pure and client-safe.
 */

import { MODE_WEIGHTS, loopMinutes } from '@/lib/plan/modes'
import {
  FORBIDDEN_NUDGE_WORDS,
  UTILISATION_MIN,
  type FeasibilityOption,
  type FeasibilityReport,
  type FeasibilityState,
  type FeasibilitySubject,
  type RoadmapMode,
  type SessionLength,
  type TopicPriority,
} from '@/lib/plan/roadmap-types'

export type SubjectDemandInput = {
  code: string
  label: string
  daysToPaper: number
  studyDaysToPaper: number
  /** The subject's ranked topics (rankSubjectTopics). */
  pool: TopicPriority[]
  inTaper: boolean
  /** The feasibility option "put one subject first": its priority topics are admitted before the others'. */
  prioritised?: boolean
  /** The subject's papers when it sits more than one, for the card's row. */
  papers?: Array<{ component?: string; examDate: string; daysToPaper: number }>
}

/** Study days a loop needs before the taper, its steps spaced: weak = diagnose+repair, recall, prove; strong = timed set, error review. */
export const WEAK_LOOP_STUDY_DAYS = 3
export const STRONG_LOOP_STUDY_DAYS = 2

/** The last study days before a paper are review only; loops must finish before them. */
const TAPER_STUDY_DAYS = 2

const MAX_TRADEOFFS = 4

/** The buffer line rounds to this many minutes, like the card's own arithmetic did. */
const BUFFER_ROUND_TO = 5

export const OPTIONS_BY_STATE: Record<FeasibilityState, FeasibilityOption[]> = {
  // A single option: the wizard hides a one-answer fieldset and lets its Build button be the action.
  on_track: ['keep'],
  focused: ['keep', 'add_time', 'change_mode'],
  tight: ['keep', 'add_time', 'prioritise_subject', 'change_mode'],
}

/** One line per state. The rows under it carry the numbers; the headline never repeats them. */
export const HEADLINE_BY_STATE: Record<FeasibilityState, string> = {
  on_track: 'Everything this style asks for fits before your papers.',
  focused: 'What fits before each paper is in. The rest waits — the rows below say which.',
  tight: 'Time is tight. The plan keeps the topics that matter most and real breaks; it does not pretend you can do everything.',
}

/** The headline a report should show — a function of the report so a caller can re-derive it after editing the state. */
export function headlineFor(report: Pick<FeasibilityReport, 'state'>): string {
  return HEADLINE_BY_STATE[report.state]
}

export function loopFits(loop: 'weak' | 'strong', studyDaysToTaper: number): boolean {
  return studyDaysToTaper >= (loop === 'weak' ? WEAK_LOOP_STUDY_DAYS : STRONG_LOOP_STUDY_DAYS)
}

/** A subject is review-only from here: nothing new is demanded. */
function reviewOnly(subject: Pick<SubjectDemandInput, 'inTaper' | 'studyDaysToPaper'>): boolean {
  return subject.inTaper || subject.studyDaysToPaper <= TAPER_STUDY_DAYS
}

/**
 * Loops admitted in pool order, each consuming its study days until none
 * are left. Greedy and sequential — one loop at a time per subject — which
 * is conservative on purpose: the scheduler may interleave, but the must
 * demand should never promise more than the calendar can hold.
 */
function admitted(topics: TopicPriority[], studyDaysToTaper: number): { minutes: number; count: number } {
  let days = studyDaysToTaper
  let minutes = 0
  let count = 0
  for (const t of topics) {
    if (!loopFits(t.loop, days)) continue
    days -= t.loop === 'weak' ? WEAK_LOOP_STUDY_DAYS : STRONG_LOOP_STUDY_DAYS
    minutes += loopMinutes(t.loop)
    count += 1
  }
  return { minutes, count }
}

/**
 * A subject's demand in minutes. `full` is the whole pool (what the report
 * tests on_track against); `admittedMust` is the priority loops that fit
 * before the taper (what it tests tight against). `admittedFull` stays for
 * calibration — it is no longer what the state reads.
 */
export function demandFor(
  subject: SubjectDemandInput,
  mode: RoadmapMode
): { must: number; full: number; admittedMust: number; admittedFull: number; admittedMustTopics: number } {
  void mode // the band on each topic already carries the mode's must share
  if (reviewOnly(subject)) return { must: 0, full: 0, admittedMust: 0, admittedFull: 0, admittedMustTopics: 0 }
  const mustTopics = subject.pool.filter((t) => t.band === 'must')
  const must = mustTopics.reduce((n, t) => n + loopMinutes(t.loop), 0)
  const full = subject.pool.reduce((n, t) => n + loopMinutes(t.loop), 0)
  const studyDaysToTaper = Math.max(0, subject.studyDaysToPaper - TAPER_STUDY_DAYS)
  const admittedMust = admitted(mustTopics, studyDaysToTaper)
  return {
    must,
    full,
    admittedMust: admittedMust.minutes,
    admittedFull: admitted(subject.pool, studyDaysToTaper).minutes,
    admittedMustTopics: admittedMust.count,
  }
}

export type AssessFeasibilityInput = {
  mode: RoadmapMode
  sessionLength: SessionLength
  /** Work minutes across study days after layout. */
  supplyMinutes: number
  /** Work minutes the plan scheduled. */
  plannedMinutes: number
  /** Σ capacity over study days. */
  capacityMinutes: number
  /** Σ(work + breaks) laid out. */
  laidMinutes: number
  /** Study days in the plan, for the buffer line's "a day". */
  studyDays?: number
  /** plannedTopics counts topics whose marked question is on the calendar; started lists the ones opened but not yet there. */
  subjects: Array<SubjectDemandInput & { plannedTopics: number; plannedMinutes: number; later: string[]; started?: string[] }>
}

/**
 * Minutes a study day keeps free: capacity minus what was laid (work and
 * breaks), over the study days, rounded to five. Without a study-day count
 * the longest run to a paper stands in for it.
 */
export function bufferMinutesPerDay(input: Pick<AssessFeasibilityInput, 'capacityMinutes' | 'laidMinutes' | 'studyDays' | 'subjects'>): number {
  const days = typeof input.studyDays === 'number' ? input.studyDays : Math.max(1, ...input.subjects.map((s) => s.daysToPaper))
  if (days <= 0) return 0
  const perDay = (input.capacityMinutes - input.laidMinutes) / days
  return Math.max(0, Math.round(perDay / BUFFER_ROUND_TO) * BUFFER_ROUND_TO)
}

export function assessFeasibility(input: AssessFeasibilityInput): FeasibilityReport {
  const { supplyMinutes, capacityMinutes, laidMinutes } = input
  let demandMustMinutes = 0
  let demandFullMinutes = 0
  const admittedMustTopics = new Map<string, number>()
  for (const s of input.subjects) {
    const d = demandFor(s, input.mode)
    demandMustMinutes += d.admittedMust
    demandFullMinutes += d.full
    admittedMustTopics.set(s.code, d.admittedMustTopics)
  }

  // What "N of M reached" is measured against: never fewer than the plan actually proved, so a row cannot read "5 of 5"
  // while seven are on the calendar. A review-only subject demands nothing and reaches nothing.
  const reachable = new Map<string, number>()
  for (const s of input.subjects) {
    reachable.set(s.code, reviewOnly(s) ? 0 : Math.max(admittedMustTopics.get(s.code) ?? 0, s.plannedTopics))
  }

  const allReviewOnly = input.subjects.every(reviewOnly)
  let state: FeasibilityState
  if (supplyMinutes >= demandFullMinutes) state = 'on_track'
  else if (supplyMinutes >= demandMustMinutes || allReviewOnly) state = 'focused'
  else state = 'tight'

  // The time may fit, but on_track is a claim about the calendar: every topic's loop is on it. Anything waiting — a
  // topic left for later, a priority topic the days before the taper could not hold, a topic opened whose marked
  // question never landed, or fewer proved than the priority loops that fit — makes the plan focused.
  const live = input.subjects.filter((s) => !reviewOnly(s))
  const waiting = live.filter(
    (s) =>
      s.later.length > 0 ||
      (s.started?.length ?? 0) > 0 ||
      s.pool.filter((t) => t.band === 'must').length > (reachable.get(s.code) ?? 0) ||
      s.plannedTopics < (admittedMustTopics.get(s.code) ?? 0)
  )
  if (state === 'on_track' && waiting.length > 0) state = 'focused'

  const utilisation = laidMinutes / Math.max(1, capacityMinutes)
  const subjects: FeasibilitySubject[] = input.subjects.map((s) => ({
    code: s.code,
    label: s.label,
    daysToPaper: s.daysToPaper,
    mustTopics: s.pool.filter((t) => t.band === 'must').length,
    plannedTopics: s.plannedTopics,
    mustReachable: reachable.get(s.code) ?? 0,
    started: [...(s.started ?? [])],
    later: [...s.later],
    minutes: s.plannedMinutes,
    reviewOnly: reviewOnly(s),
    ...(s.papers && s.papers.length > 1 ? { papers: s.papers.map((p) => ({ ...p })) } : {}),
  }))

  // Only what the rows cannot say: the tight verdict, the cost of short sessions, and the time kept free.
  const tradeoffs: string[] = []
  if (state === 'tight') tradeoffs.push('Not everything fits. The plan protects the priority topics and keeps breaks real.')
  if (input.sessionLength === 20) {
    tradeoffs.push(
      `20-minute sessions give you about ${supplyMinutes} focused minutes of your ${capacityMinutes} — no timed papers or sets, questions one at a time. That's the cost of short blocks, and it's fine.`
    )
  }
  if (utilisation < UTILISATION_MIN) {
    const free = bufferMinutesPerDay(input)
    tradeoffs.push(
      free > 0
        ? `About ${free} min a day is left free on purpose — for days that don't go to plan.`
        : "Some of your time is left free on purpose — for days that don't go to plan."
    )
  }

  const report: FeasibilityReport = {
    state,
    supplyMinutes,
    plannedMinutes: input.plannedMinutes,
    demandMustMinutes,
    demandFullMinutes,
    utilisation,
    ratios: { must: supplyMinutes / Math.max(1, demandMustMinutes), full: supplyMinutes / Math.max(1, demandFullMinutes) },
    subjects,
    tradeoffs: tradeoffs.slice(0, MAX_TRADEOFFS),
    options: [...OPTIONS_BY_STATE[state]],
    headline: '',
    capacityMinutes,
    laidMinutes,
    studyDays: input.studyDays,
  }
  report.headline = headlineFor(report)
  return report
}

/** True when a student-facing line uses none of the words the roadmap bans. Tests pin every string here through it. */
export function isCalmCopy(text: string): boolean {
  const lower = text.toLowerCase()
  return !FORBIDDEN_NUDGE_WORDS.some((w) => lower.includes(w))
}

/** The mode's must share, exposed so the wizard can say "the top 65%" without importing the weights. */
export function mustShareFor(mode: RoadmapMode): number {
  return MODE_WEIGHTS[mode].mustShare
}
