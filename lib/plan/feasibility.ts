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
 * Demand is what could be done, not everything on the syllabus. A loop
 * needs a few study days with its steps spaced out, so a subject with two
 * study days left cannot "demand" thirty loops; only loops that fit before
 * the taper are admitted, and a subject inside its taper demands nothing
 * here (the scheduler adds its review). That is why a one-day plan is never
 * "tight": it is a review day, and the state says so.
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
  /** The feasibility option "prioritise one subject": its must-cover topics are admitted before the others'. */
  prioritised?: boolean
}

/** Study days a loop needs before the taper, its steps spaced: weak = diagnose+repair, recall, prove; strong = timed set, error review. */
export const WEAK_LOOP_STUDY_DAYS = 3
export const STRONG_LOOP_STUDY_DAYS = 2

/** The last study days before a paper are review only; loops must finish before them. */
const TAPER_STUDY_DAYS = 2

/** Names quoted in a "left for later" line before it says "+k more". */
const LATER_NAMES_SHOWN = 3
const MAX_TRADEOFFS = 4

export const OPTIONS_BY_STATE: Record<FeasibilityState, FeasibilityOption[]> = {
  on_track: ['keep'],
  focused: ['keep', 'add_time', 'change_mode'],
  tight: ['keep', 'add_time', 'prioritise_subject', 'change_mode'],
}

export const HEADLINE_BY_STATE: Record<FeasibilityState, string> = {
  on_track: 'Your plan fits the time you have.',
  focused: 'A focused plan: the must-cover topics fit, and the rest waits.',
  tight: "Your timeline is tight. We'll protect the essentials, keep breaks realistic, and avoid pretending you can revise everything at once.",
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
 * is conservative on purpose: the scheduler may interleave, but demand
 * should never promise more than the calendar can hold.
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
  /** Study days in the plan, for "in hand" per day. */
  studyDays?: number
  /** plannedTopics counts topics whose marked question is on the calendar; started lists the ones opened but not yet there. */
  subjects: Array<SubjectDemandInput & { plannedTopics: number; plannedMinutes: number; later: string[]; started?: string[] }>
}

function joinNames(names: string[]): string {
  const shown = names.slice(0, LATER_NAMES_SHOWN)
  const more = names.length - shown.length
  return more > 0 ? `${shown.join(', ')}, +${more} more` : shown.join(', ')
}

export function assessFeasibility(input: AssessFeasibilityInput): FeasibilityReport {
  const { supplyMinutes, capacityMinutes, laidMinutes } = input
  let demandMustMinutes = 0
  let demandFullMinutes = 0
  const reachable = new Map<string, number>()
  for (const s of input.subjects) {
    const d = demandFor(s, input.mode)
    demandMustMinutes += d.admittedMust
    demandFullMinutes += d.admittedFull
    reachable.set(s.code, d.admittedMustTopics)
  }

  const allReviewOnly = input.subjects.every(reviewOnly)
  let state: FeasibilityState
  if (supplyMinutes >= demandFullMinutes) state = 'on_track'
  else if (supplyMinutes >= demandMustMinutes || allReviewOnly) state = 'focused'
  else state = 'tight'
  // The time fits, but the calendar did not reach every must-cover loop it could hold: the rest waits, so say so.
  const shortfall = input.subjects.filter((s) => !reviewOnly(s) && s.plannedTopics < (reachable.get(s.code) ?? 0))
  if (state === 'on_track' && shortfall.length > 0) state = 'focused'

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
  }))

  const tradeoffs: string[] = []
  if (state === 'tight') tradeoffs.push('Not everything fits. The plan protects the must-cover topics and keeps breaks real.')
  if (input.sessionLength === 20) {
    tradeoffs.push(
      `20-minute sessions give you about ${supplyMinutes} focused minutes of your ${capacityMinutes} — no timed papers or sets, questions one at a time. That's the cost of short blocks, and it's fine.`
    )
  }
  for (const s of shortfall) {
    const started = s.started ?? []
    const n = started.length
    if (n === 0) continue
    tradeoffs.push(`${s.label}: ${n} ${n === 1 ? 'topic is' : 'topics are'} opened but ${n === 1 ? 'its' : 'their'} marked question is not on the calendar yet — ${joinNames(started)}.`)
  }
  for (const s of input.subjects) {
    // A subject in its taper is review only; nothing is "left for later" because nothing new was ever due.
    if (s.later.length === 0 || reviewOnly(s)) continue
    const n = s.later.length
    tradeoffs.push(`${s.label}: ${n} ${n === 1 ? 'topic' : 'topics'} left for later — ${joinNames(s.later)}.`)
  }
  if (utilisation < UTILISATION_MIN) tradeoffs.push("Some of your time stays in hand on purpose — for days that don't go to plan.")

  return {
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
    headline: HEADLINE_BY_STATE[state],
    capacityMinutes,
    laidMinutes,
    studyDays: input.studyDays,
  }
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
