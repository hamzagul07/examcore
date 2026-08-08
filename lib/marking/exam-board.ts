import { resolveBoard } from '@/lib/courses/board'
import { isIbSubjectCode } from '@/lib/ib/marking-config'

/** Labels used in derive / verify / rewrite prompts. */
export type MarkingBoardLabel = 'Cambridge' | 'IB Diploma' | 'Edexcel'

export function markingBoardLabel(
  subjectCode: string | null | undefined,
  opts?: { resolvedIb?: unknown | null }
): MarkingBoardLabel {
  if (opts?.resolvedIb || isIbSubjectCode(subjectCode ?? '')) return 'IB Diploma'
  if (subjectCode && resolveBoard(subjectCode) === 'edexcel') return 'Edexcel'
  return 'Cambridge'
}

export function isEdexcelSubjectCode(code?: string | null): boolean {
  return !!code && resolveBoard(code) === 'edexcel'
}
