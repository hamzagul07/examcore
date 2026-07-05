import type { PaperKind } from '@/lib/courses/types'

/** Objective depth thresholds — "complete enough" for published/premium lessons. */
export type QualityTier = 'pilot' | 'published' | 'premium'

export type QualityTargets = {
  minWorkedExamples: number
  minFlashcards: number
  minHeadingGroups: number
  minCoverageScore: number
  requireStemAnalogy: boolean
  maxPrimaryVisuals: number
}

const STEM_ABSTRACT = new Set(['9701', '9702', '9700', '9709', '9231', '9618'])

export function qualityTierForStatus(
  status: string | undefined
): QualityTier {
  if (status === 'premium' || status === 'published') return 'premium'
  if (status === 'pilot') return 'pilot'
  return 'published'
}

export function getQualityTargets(
  subjectCode: string,
  tier: QualityTier = 'premium'
): QualityTargets {
  const base: QualityTargets = {
    minWorkedExamples: tier === 'pilot' ? 1 : 2,
    minFlashcards: tier === 'pilot' ? 4 : 8,
    minHeadingGroups: tier === 'pilot' ? 2 : 3,
    minCoverageScore: tier === 'pilot' ? 0.6 : 0.8,
    requireStemAnalogy: STEM_ABSTRACT.has(subjectCode.replace(/^ib-/, '').split('-')[0] ?? subjectCode),
    maxPrimaryVisuals: 1,
  }

  if (subjectCode.startsWith('ib-')) {
    return {
      ...base,
      minWorkedExamples: tier === 'pilot' ? 1 : 2,
      minFlashcards: tier === 'pilot' ? 4 : 6,
      requireStemAnalogy: false,
    }
  }

  return base
}

export function isStemSubject(subjectCode: string): boolean {
  const cambridge = subjectCode.startsWith('ib-')
    ? null
    : subjectCode.match(/^(\d+)/)?.[1]
  return cambridge ? STEM_ABSTRACT.has(cambridge) : false
}

export type PaperStyleHint = {
  paperType?: PaperKind
  requireMcqCheck: boolean
  requirePracticalVocab: boolean
}

export function paperStyleHints(paperType?: PaperKind): PaperStyleHint {
  return {
    paperType,
    requireMcqCheck: paperType === 'mcq',
    requirePracticalVocab: paperType === 'practical',
  }
}

/** Minimum syllabus coverage % before autonomous improvement loop may activate (Phase 3 gate). */
export const IMPROVEMENT_LOOP_MIN_COVERAGE_PCT = 95
