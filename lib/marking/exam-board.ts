import { resolveBoard } from '@/lib/courses/board'
import { isIbSubjectCode } from '@/lib/ib/marking-config'

/** Labels used in derive / verify / rewrite prompts. */
export type MarkingBoardLabel =
  | 'Cambridge'
  | 'IB Diploma'
  | 'Edexcel'
  | 'OxfordAQA'
  | 'AQA'
  | 'AP'

export function markingBoardLabel(
  subjectCode: string | null | undefined,
  opts?: { resolvedIb?: unknown | null }
): MarkingBoardLabel {
  if (opts?.resolvedIb || isIbSubjectCode(subjectCode ?? '')) return 'IB Diploma'
  const board = subjectCode ? resolveBoard(subjectCode) : 'cambridge'
  if (board === 'edexcel') return 'Edexcel'
  if (board === 'oxfordaqa') return 'OxfordAQA'
  if (board === 'aqa') return 'AQA'
  if (board === 'ap') return 'AP'
  return 'Cambridge'
}

export function isEdexcelSubjectCode(code?: string | null): boolean {
  return !!code && resolveBoard(code) === 'edexcel'
}
