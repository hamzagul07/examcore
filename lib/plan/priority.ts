/**
 * What to work on first, and why the plan may say so.
 *
 * Every syllabus leaf the service could find a signal for arrives as a
 * TopicSignals; this module turns it into a TopicPriority — a score, a
 * band, the loop it expects and at most three lines of evidence — using the
 * mode's weights from lib/plan/modes.ts. The scheduler places topics in
 * score order; the "Why this?" sheet shows the evidence unchanged.
 *
 * The rules that keep the score honest:
 *
 *   A self-rating is a prior. With fewer than CONFIDENT_ATTEMPTS marked
 *   answers on a leaf the estimate blends the marks with the rating, and
 *   says how unsure it is; with enough marks the marks win outright. A
 *   "confident" student with nothing marked gets loop 'strong' and
 *   uncertainty 1 — the scheduler still opens with a diagnostic.
 *
 *   Evidence or silence. Frequency copy needs the frequency signal, which
 *   the service only sets above the indexing thresholds. "Weak area" needs
 *   three marked answers; one or two is "recent practice". 'core_syllabus'
 *   is never produced: no tree carries the flag.
 *
 *   Nothing predicts the paper. Every explanation is a template and a
 *   number; the on_syllabus line is the default and the last to survive a
 *   cut, because it is true of every topic.
 *
 *   Improvement is time-aware. A fresh topic the day before the paper
 *   cannot be learned in time and scores near zero on that term; a rusty
 *   one with a week left scores high. Urgency never drops below
 *   URGENCY_FLOOR, so a far paper is not forgotten.
 *
 *   A measured gap outranks a frequent topic the student already has. The
 *   score is
 *
 *     score = urgency × ( w.importance × importance × (1 + w.evidence × evidence)
 *                           × (w.gap × gap) × (w.improvement × improvement)
 *                       + w.prerequisite × prerequisite
 *                       + w.review × review )
 *
 *   where evidence is the share of indexed sittings that set the topic.
 *   Representation multiplies importance rather than standing alone as an
 *   additive term: a topic the student scores 80% on has a product term
 *   near zero, and an added 0.8 × 0.9 for frequency would lift it above
 *   the topic they score 30% on. Multiplying keeps frequency as a lift —
 *   an untested high-yield topic still ranks above an untested low-yield
 *   one — while a gap of 0.7 is never behind a gap of 0.2, whatever the
 *   papers say. Prerequisite and review stay additive: a review that is
 *   due is due even on a mastered topic.
 *
 * Pure and client-safe.
 */

import {
  CRITICAL_BELOW_PCT,
  MODE_WEIGHTS,
  URGENCY_FLOOR,
  WEAK_BELOW_PCT,
} from '@/lib/plan/modes'
import { normalisePaperLabel } from '@/lib/plan/paper-match'
import { formatPlanDate } from '@/lib/plan/plan-view'
import {
  CONFIDENT_ATTEMPTS,
  EVIDENCE_EXPLANATION_MAX,
  SELF_RATING_LABEL,
  SELF_RATING_PRIOR,
  type EvidenceItem,
  type RoadmapMode,
  type SelfRating,
  type TopicPriority,
  type TopicSignals,
} from '@/lib/plan/roadmap-types'

export type ScoreContext = {
  mode: RoadmapMode
  /** Calendar days to this subject's paper. */
  daysToPaper: number
  /** Calendar days the whole plan spans. */
  planLength: number
  /** Study days (capacity above the floor) before this subject's paper. */
  studyDaysToPaper: number
  subjectLabel: string
  board?: string
  component?: string
  examDate?: string
  todayIso?: string
}

/**
 * Study days a loop needs to finish before the paper. Weak: diagnose and
 * repair on one day, recall the next, prove, then a spaced review. Strong:
 * a timed set and its error review, then recall later.
 */
export const WEAK_LOOP_DAYS_NEEDED = 4
export const STRONG_LOOP_DAYS_NEEDED = 2

/** The prior's weight in the blend, in "attempts": three marked answers count as much as the rating. */
const PRIOR_WEIGHT = 3

/** The prerequisite term when a leaf comes before a scheduled one under the same parent. */
const PREREQUISITE_BONUS = 0.3

/** Bands: the mode's must share first, then up to this share is 'should', the rest 'could'. */
const SHOULD_UP_TO = 0.85

const CONFIDENCE_RANK: Record<EvidenceItem['confidence'], number> = { low: 0, medium: 1, high: 2 }

// --- mastery ---------------------------------------------------------------------------------

export function masteryEstimate(signal: TopicSignals, prior: number): { mastery: number; uncertainty: number } {
  const m = signal.mastery
  const attempts = m ? Math.max(0, Math.floor(m.attempts)) : 0
  if (!m || attempts === 0) return { mastery: prior, uncertainty: 1 }
  const pct = Math.max(0, Math.min(100, m.percentage)) / 100
  if (attempts >= CONFIDENT_ATTEMPTS) return { mastery: pct, uncertainty: 0 }
  return {
    mastery: (pct * attempts + prior * PRIOR_WEIGHT) / (attempts + PRIOR_WEIGHT),
    uncertainty: 1 - Math.min(attempts, CONFIDENT_ATTEMPTS) / CONFIDENT_ATTEMPTS,
  }
}

export function loopFor(mastery: number): 'weak' | 'strong' {
  return mastery < WEAK_BELOW_PCT / 100 ? 'weak' : 'strong'
}

// --- copy ------------------------------------------------------------------------------------

/** Never longer than the sheet allows; a cut line ends on an ellipsis rather than mid-number. */
function clip(text: string): string {
  if (text.length <= EVIDENCE_EXPLANATION_MAX) return text
  return `${text.slice(0, EVIDENCE_EXPLANATION_MAX - 1).trimEnd()}…`
}

/** "Paper 1", "Papers 1 and 2", "Papers 1, 2 and 3"; an unreadable label is passed through as written. */
function paperPhrase(label: string | undefined): string | null {
  const raw = (label ?? '').trim()
  if (!raw) return null
  const papers = normalisePaperLabel(raw).map((p) => p.slice(1))
  if (papers.length === 0) return raw
  if (papers.length === 1) return `Paper ${papers[0]}`
  return `Papers ${papers.slice(0, -1).join(', ')} and ${papers[papers.length - 1]}`
}

function daysBetween(fromIso: string, toIso: string): number | null {
  const a = Date.parse(`${fromIso.slice(0, 10)}T00:00:00Z`)
  const b = Date.parse(`${toIso.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.max(0, Math.round((b - a) / 86_400_000))
}

/**
 * The one line that is true of every topic — "On the Cambridge Mathematics
 * syllabus for Paper 1" — as a single-item why. buildWhy opens with it and
 * may cut it to make room; the scheduler uses it directly for a review of a
 * topic the plan never opened, so that card still has one honest line.
 */
export function syllabusOnlyWhy(subjectLabel: string, board?: string, paperLabel?: string): EvidenceItem[] {
  const b = (board ?? '').trim()
  const paper = paperPhrase(paperLabel)
  return [
    {
      type: 'on_syllabus',
      source: 'syllabus',
      confidence: 'high',
      explanation: clip(`On the ${b ? `${b} ` : ''}${subjectLabel} syllabus${paper ? ` for ${paper}` : ''}`),
    },
  ]
}

function buildWhy(
  signal: TopicSignals,
  selfRating: SelfRating | undefined,
  ctx: ScoreContext,
  laterCode: string | undefined,
  nameOf: ((code: string) => string | undefined) | undefined
): EvidenceItem[] {
  const why: EvidenceItem[] = [...syllabusOnlyWhy(ctx.subjectLabel, ctx.board, signal.paper)]
  const subject = ctx.subjectLabel

  const f = signal.frequency
  if (f) {
    const scope = ctx.component && f.scope === 'component' ? ` ${ctx.component}` : ''
    const range = f.from && f.to ? ` (${f.from === f.to ? f.from : `${f.from}–${f.to}`})` : ''
    const partial = f.taggedShare < 1 ? ' (not every question is tagged yet)' : ''
    let line = `Set in ${f.papers} of the ${f.of} ${subject}${scope} sittings MarkScheme has indexed${range}${partial}`
    if (line.length > EVIDENCE_EXPLANATION_MAX) line = `Set in ${f.papers} of the ${f.of} ${subject}${scope} sittings MarkScheme has indexed${range}`
    why.push({
      type: 'frequency',
      source: 'indexed_papers',
      confidence: 'medium',
      explanation: clip(line),
      stat: { n: f.papers, of: f.of, from: f.from, to: f.to },
    })
  }

  const m = signal.mastery
  const attempts = m ? Math.max(0, Math.floor(m.attempts)) : 0
  if (m && attempts >= CONFIDENT_ATTEMPTS && m.percentage < WEAK_BELOW_PCT) {
    const pct = Math.round(m.percentage)
    why.push({
      type: 'weak_area',
      source: 'user_performance',
      confidence: m.percentage < CRITICAL_BELOW_PCT ? 'high' : 'medium',
      explanation: clip(`You're at ${pct}% across ${attempts} marked answers here.`),
    })
  } else if (m && attempts > 0 && attempts < CONFIDENT_ATTEMPTS) {
    const pct = Math.round(m.percentage)
    why.push({
      type: 'recent_practice',
      source: 'user_performance',
      confidence: 'low',
      explanation: clip(
        `You've marked ${attempts} ${attempts === 1 ? 'answer' : 'answers'} here at ${pct}% — too few to call it a weak area yet; this one confirms where it stands.`
      ),
    })
  }

  if (attempts < CONFIDENT_ATTEMPTS && selfRating) {
    why.push({
      type: 'self_rated',
      source: 'self_report',
      confidence: 'low',
      explanation: clip(
        `You rated ${subject} "${SELF_RATING_LABEL[selfRating]}". We'll go with that until your marked answers say otherwise.`
      ),
    })
  }

  if (laterCode && signal.parentCode) {
    const later = nameOf?.(laterCode) ?? laterCode
    why.push({
      type: 'prerequisite',
      source: 'syllabus',
      confidence: 'low',
      explanation: clip(`Listed before ${later} in the syllabus, so it's worth doing first`),
    })
  }

  if (signal.reviewDueAt && ctx.todayIso && signal.reviewDueAt.slice(0, 10) <= ctx.todayIso) {
    const ago = m?.lastAt ? daysBetween(m.lastAt, ctx.todayIso) : null
    why.push({
      type: 'review_due',
      source: 'user_performance',
      confidence: 'medium',
      explanation: clip(
        ago !== null && ago > 0
          ? `Due for review — you worked on this ${ago} ${ago === 1 ? 'day' : 'days'} ago.`
          : 'Due for review — time for this one to come back.'
      ),
    })
  }

  if (signal.onNearestPaper) {
    const date = ctx.examDate ? ` (${formatPlanDate(ctx.examDate)})` : ''
    why.push({
      type: 'nearest_paper',
      source: 'syllabus',
      confidence: 'medium',
      explanation: clip(ctx.component ? `On ${ctx.component}, your ${subject} paper${date}` : `On your ${subject} paper${date}`),
    })
  }

  // Three at most: the syllabus line goes first, then the least confident.
  while (why.length > 3) {
    const syllabus = why.findIndex((w) => w.type === 'on_syllabus')
    if (syllabus >= 0) {
      why.splice(syllabus, 1)
      continue
    }
    let lowest = 0
    for (let i = 1; i < why.length; i++) {
      if (CONFIDENCE_RANK[why[i]!.confidence] <= CONFIDENCE_RANK[why[lowest]!.confidence]) lowest = i
    }
    why.splice(lowest, 1)
  }
  return why
}

// --- scoring ---------------------------------------------------------------------------------

/**
 * One topic's score, from the mode's weights:
 *
 *   score = urgency × (importance · (1 + evidence) · gap · improvement + prerequisite + review)
 *
 * with every term weighted by MODE_WEIGHTS[mode] (the file-top comment has
 * the weights written out). Evidence scales importance; it never adds on
 * its own. The band is set by rankSubjectTopics once the subject is
 * sorted; here it is 'should'.
 */
export function scoreTopic(
  signal: TopicSignals,
  prior: number,
  selfRating: SelfRating | undefined,
  ctx: ScoreContext,
  scheduledCodes: ReadonlySet<string>,
  nameOf?: (code: string) => string | undefined
): TopicPriority {
  const w = MODE_WEIGHTS[ctx.mode]
  const { mastery, uncertainty } = masteryEstimate(signal, prior)
  const loop = loopFor(mastery)

  const daysToPaper = Math.max(0, ctx.daysToPaper)
  const urgency = Math.max(URGENCY_FLOOR, 1 + w.urgency * (1 - daysToPaper / Math.max(1, ctx.planLength)))
  const importance = signal.coreWeight * (signal.onNearestPaper ? 1.15 : 1)
  const gap = 1 - mastery
  const loopDays = loop === 'weak' ? WEAK_LOOP_DAYS_NEEDED : STRONG_LOOP_DAYS_NEEDED
  const improvement = (1 - mastery) * Math.min(1, Math.max(0, ctx.studyDaysToPaper) / loopDays)

  const laterCode = signal.parentCode ? signal.prerequisiteOf?.find((c) => scheduledCodes.has(c)) : undefined
  const prerequisite = laterCode ? PREREQUISITE_BONUS : 0
  const review = signal.reviewDueAt && ctx.todayIso && signal.reviewDueAt.slice(0, 10) <= ctx.todayIso ? 1 : 0
  const evidence = signal.frequency ? Math.min(1, signal.frequency.papers / Math.max(1, signal.frequency.of)) : 0

  const represented = importance * (1 + w.evidence * evidence)
  const score =
    urgency *
    (w.importance * represented * (w.gap * gap) * (w.improvement * improvement) +
      w.prerequisite * prerequisite +
      w.review * review)

  return {
    code: signal.code,
    name: signal.name,
    score,
    why: buildWhy(signal, selfRating, ctx, laterCode, nameOf),
    band: 'should',
    mastery,
    uncertainty,
    loop,
  }
}

/**
 * A subject's leaves scored and sorted, highest first, ties by syllabus
 * order. The prerequisite term needs to know what ranks above a leaf, so
 * the pass runs twice: once blind, once with each leaf seeing the codes
 * that beat it the first time. Bands are shares of the sorted list.
 */
export function rankSubjectTopics(
  signals: TopicSignals[],
  selfRating: SelfRating | undefined,
  ctx: ScoreContext,
  opts: { nameOf?: (code: string) => string | undefined } = {}
): TopicPriority[] {
  if (signals.length === 0) return []
  const prior = selfRating ? SELF_RATING_PRIOR[selfRating] : 0.5
  const orderOf = new Map(signals.map((s) => [s.code, s.order]))
  const byScore = (a: TopicPriority, b: TopicPriority) =>
    b.score - a.score || (orderOf.get(a.code) ?? 0) - (orderOf.get(b.code) ?? 0)

  const none = new Set<string>()
  const first = signals.map((s) => scoreTopic(s, prior, selfRating, ctx, none, opts.nameOf)).sort(byScore)

  const above = new Set<string>()
  const bySignal = new Map(signals.map((s) => [s.code, s]))
  const second: TopicPriority[] = []
  for (const t of first) {
    second.push(scoreTopic(bySignal.get(t.code)!, prior, selfRating, ctx, above, opts.nameOf))
    above.add(t.code)
  }
  second.sort(byScore)

  const n = second.length
  const must = Math.ceil(MODE_WEIGHTS[ctx.mode].mustShare * n)
  const should = Math.ceil(SHOULD_UP_TO * n)
  return second.map((t, i) => ({ ...t, band: i < must ? 'must' : i < should ? 'should' : 'could' }))
}

/** The pool minus what is placed or dropped, order kept. Non-empty while anything remains. */
export function eligibleTopics(pool: TopicPriority[], placedCodes: ReadonlySet<string>, droppedCodes: ReadonlySet<string>): TopicPriority[] {
  return pool.filter((t) => !placedCodes.has(t.code) && !droppedCodes.has(t.code))
}
