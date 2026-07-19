/**
 * Shared types for the Insights dashboard (hero, patterns, practice, wins,
 * journey timeline). Everything here is derived from REAL attempt data — when
 * the signal is too thin we surface honest empty states instead of inventing
 * numbers. See lib/insights/* for the derivation logic.
 */

import type { ErrorClassification } from '@/lib/error-classifications'

/**
 * How much signal the user has given us. Drives empty-state copy across every
 * panel. Threshold of 5 marks matches the product promise that "insights appear
 * after 5+ marks".
 */
export type DashboardState = 'zero' | 'low' | 'active'

export const PATTERN_UNLOCK_THRESHOLD = 5

export function resolveDashboardState(attemptCount: number): DashboardState {
  if (attemptCount === 0) return 'zero'
  if (attemptCount < PATTERN_UNLOCK_THRESHOLD) return 'low'
  return 'active'
}

/** A specific past-paper question that exists in mark_schemes (never a 404). */
export interface Recommendation {
  paperCode: string
  paperSession: string
  questionNumber: string
  totalMarks: number
  /** Honest, one-line reason this question is worth doing now. */
  reason: string
  /** Human label for the pattern/topic this targets. */
  targetLabel: string
  /** Leaf code this targets, when topic-derived. */
  topicCode?: string
}

/**
 * A "drill your weakest spot" action. Cambridge points at a real past-paper
 * question (`paper`); IB has no stored questions, so it points at a topic and the
 * /mark practice flow generates one (`topic`). Powers WeakSpotDrillCard.
 */
export type NextDrill =
  | ({ kind: 'paper' } & Recommendation)
  | {
      kind: 'topic'
      subjectCode: string
      topicCode: string
      topicName: string
      reason: string
    }

/** A ranked, evidence-backed error pattern. */
export interface Pattern {
  classification: ErrorClassification
  label: string
  color: string
  /** How many of the analysed marks carried this label. */
  count: number
  /** Of the attempts in scope, how many contained at least one such error. */
  attemptsAffected: number
  /** Total attempts analysed (denominator for "X of your last Y"). */
  attemptsAnalysed: number
  /** One honest sentence describing the pattern and its remedy. */
  insight: string
}

/** The single strongest signal, shown as the hero card. */
export interface HeroInsight {
  /** Drives the visual treatment + icon. */
  kind: 'error_pattern' | 'topic_deficit' | 'grade_up' | 'momentum' | 'onboarding'
  eyebrow: string
  headline: string
  /** The diagnosis + prescription, in honest tutor voice. */
  body: string
  /** Primary CTA label. */
  ctaLabel: string
  /** When set, the CTA drills a real recommended question. */
  drill?: Recommendation
  /** Fallback href when there's no specific question to drill. */
  ctaHref?: string
  /** For low-attempt users: progress toward the 5-mark unlock. */
  progress?: { current: number; target: number }
}

export type WinKind =
  | 'first_mark'
  | 'personal_best'
  | 'exam_ready'
  | 'streak'
  | 'coverage'
  | 'grade_up'
  | 'perfect_score'

/** A genuine milestone the student actually reached. */
export interface Win {
  kind: WinKind
  title: string
  detail: string
  /** ISO date the win occurred (or was most recently true). */
  date: string
}

export type StationKind =
  | 'first_mark'
  | 'attempt'
  | 'milestone'
  | 'streak'
  | 'exam_ready'
  | 'best'
  | 'latest'

/** One stop on the metro-map journey timeline. */
export interface TimelineStation {
  id: string
  kind: StationKind
  date: string
  /** Short label rendered next to the station. */
  label: string
  /** Optional secondary line (e.g. score, topic). */
  detail?: string
  /** 0-100 score when this station maps to a marked attempt. */
  score?: number
  /** True for the headline milestones shown in "Story" view. */
  major: boolean
}
