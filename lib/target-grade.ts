import { GRADE_BOUNDARIES } from './grade-boundaries'
import { isApBoard, isIbBoard } from '@/lib/profile-options'

/**
 * Target grade — the grade a student is aiming for. Cambridge/A-Level boards
 * use letters, IB uses 1–7, AP uses 1–5. Stored on user_profiles.target_grade
 * as text.
 */
export const CAMBRIDGE_TARGET_GRADES = ['A*', 'A', 'B', 'C', 'D', 'E'] as const
export const IB_TARGET_GRADES = ['7', '6', '5', '4', '3', '2', '1'] as const
export const AP_TARGET_GRADES = ['5', '4', '3', '2', '1'] as const

export type TargetGradeKind = 'cambridge' | 'ib' | 'ap'

export function targetGradeKindFromBoard(board: string): TargetGradeKind {
  if (isIbBoard(board)) return 'ib'
  if (isApBoard(board)) return 'ap'
  return 'cambridge'
}

/** A*–E percentage bands apply to Cambridge-style boards, not IB levels or AP scores. */
export function usesLetterGradeBands(board: string): boolean {
  return targetGradeKindFromBoard(board) === 'cambridge'
}

export function peakTargetStamp(kind: TargetGradeKind): string {
  if (kind === 'ib') return '7'
  if (kind === 'ap') return '5'
  return 'A*'
}

/**
 * Options for a board kind. Boolean `true`/`false` kept for IB/Cambridge call
 * sites that have not migrated to {@link TargetGradeKind}.
 */
export function targetGradeOptions(kindOrIb: TargetGradeKind | boolean): string[] {
  if (kindOrIb === true || kindOrIb === 'ib') return [...IB_TARGET_GRADES]
  if (kindOrIb === 'ap') return [...AP_TARGET_GRADES]
  return [...CAMBRIDGE_TARGET_GRADES]
}

export function isValidTargetGrade(
  kindOrIb: TargetGradeKind | boolean,
  grade: string
): boolean {
  return targetGradeOptions(kindOrIb).includes(grade)
}

/**
 * Cambridge only: percentage points from the recent-form average to the target
 * grade's boundary. Returns null for IB/AP numeric grades (no Cambridge
 * boundary) — callers then show the target without a false-precision % gap.
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
