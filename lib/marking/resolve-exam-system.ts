import { resolveBoard } from '@/lib/courses/board'
import { isExamSystemId, type ExamSystemId } from '@/lib/exam-systems'

const MARKING_SYSTEMS = new Set<ExamSystemId>(['cambridge', 'ib', 'edexcel'])

/**
 * Prefer the board picker value from the client; fall back to subject_code.
 * Returns null when neither is usable (keeps mark_runs.exam_system nullable).
 */
export function resolveMarkRunExamSystem(params: {
  explicit?: string | null
  subjectCode?: string | null
}): ExamSystemId | null {
  const raw = params.explicit?.trim().toLowerCase()
  if (raw && isExamSystemId(raw) && MARKING_SYSTEMS.has(raw)) return raw
  const code = params.subjectCode?.trim()
  if (!code) return null
  const board = resolveBoard(code)
  return MARKING_SYSTEMS.has(board) ? board : null
}
