import { GRADE_BOUNDARIES } from './grade-boundaries'

/**
 * Target grade — the grade a student is aiming for. Cambridge uses letters,
 * IB uses 1–7. Stored on user_profiles.target_grade as text.
 */
export const CAMBRIDGE_TARGET_GRADES = ['A*', 'A', 'B', 'C', 'D', 'E'] as const
export const IB_TARGET_GRADES = ['7', '6', '5', '4', '3', '2', '1'] as const

export function targetGradeOptions(isIb: boolean): string[] {
  return isIb ? [...IB_TARGET_GRADES] : [...CAMBRIDGE_TARGET_GRADES]
}

export function isValidTargetGrade(isIb: boolean, grade: string): boolean {
  return targetGradeOptions(isIb).includes(grade)
}

/**
 * Cambridge only: percentage points from the recent-form average to the target
 * grade's boundary. Returns null for IB numeric grades (no Cambridge boundary) —
 * callers then show the target without a false-precision % gap.
 */
export function gapToTargetGrade(
  averagePercentage: number | null,
  targetGrade: string | null
): { onTrack: boolean; pointsToGo: number } | null {
  if (averagePercentage == null || !targetGrade) return null
  const boundary = GRADE_BOUNDARIES.find((b) => b.grade === targetGrade)
  if (!boundary) return null
  const gap = boundary.percentage - averagePercentage
  if (gap <= 0) return { onTrack: true, pointsToGo: 0 }
  return { onTrack: false, pointsToGo: Math.ceil(gap) }
}
