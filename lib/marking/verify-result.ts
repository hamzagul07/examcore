import type { MarkingStyle } from './types'

type MarkingRecord = Record<string, unknown>

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function pointCoverage(value: unknown): number | null {
  if (!Array.isArray(value) || value.length === 0) return null

  let coverage = 0
  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null
    const mark = entry as MarkingRecord
    if (typeof mark.earned !== 'boolean') return null
    if (mark.marks === undefined) {
      coverage += 1
      continue
    }
    if (!finiteNumber(mark.marks) || mark.marks <= 0) return null
    coverage += mark.marks
  }
  return coverage
}

function criterionAwards(value: unknown): Map<string, number> | null {
  if (!Array.isArray(value) || value.length === 0) return null

  const awards = new Map<string, number>()
  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null
    const criterion = entry as MarkingRecord
    const letter =
      typeof criterion.criterion === 'string'
        ? criterion.criterion.trim().toUpperCase()
        : ''
    if (!letter || awards.has(letter) || !finiteNumber(criterion.marks_awarded)) {
      return null
    }
    awards.set(letter, criterion.marks_awarded)
  }
  return awards
}

/**
 * A second opinion may replace a score only when it re-marks the same rubric.
 * A summary-only response was coerced to 0/8 and replaced a correct 7/8, while
 * partial point/criterion arrays can create the same fabricated zeroes.
 */
export function isCompleteComparableVerifyResult(
  firstPass: MarkingRecord,
  verified: MarkingRecord,
  markingStyle: MarkingStyle
): boolean {
  if (!finiteNumber(verified.marks_earned)) return false

  const firstCriteria = criterionAwards(firstPass.criteria_results)
  if (firstCriteria) {
    const verifiedCriteria = criterionAwards(verified.criteria_results)
    if (!verifiedCriteria || verifiedCriteria.size !== firstCriteria.size) {
      return false
    }
    return [...firstCriteria.keys()].every((letter) => verifiedCriteria.has(letter))
  }

  if (markingStyle === 'level_of_response') {
    if (
      !verified.band_result ||
      typeof verified.band_result !== 'object' ||
      Array.isArray(verified.band_result)
    ) {
      return false
    }
    return finiteNumber(
      (verified.band_result as MarkingRecord).marks_awarded
    )
  }

  if (markingStyle === 'point_based') {
    const firstCoverage = pointCoverage(firstPass.marks_awarded)
    const verifiedCoverage = pointCoverage(verified.marks_awarded)
    if (
      firstCoverage === null ||
      verifiedCoverage === null ||
      verifiedCoverage !== firstCoverage
    ) {
      return false
    }

    const firstTotal = firstPass.total_marks
    return !finiteNumber(firstTotal) || verifiedCoverage === firstTotal
  }

  return false
}
