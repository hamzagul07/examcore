import { resolveBoard } from '@/lib/courses/board'
import {
  isExamSystemId,
  listMarkingExamSystems,
  type ExamSystemId,
} from '@/lib/exam-systems'

function markingSystemIds(): Set<ExamSystemId> {
  return new Set(listMarkingExamSystems().map((s) => s.id))
}

/**
 * Prefer the board picker value from the client; fall back to subject_code.
 * Returns null when neither is usable (keeps mark_runs.exam_system nullable).
 */
export function resolveMarkRunExamSystem(params: {
  explicit?: string | null
  subjectCode?: string | null
}): ExamSystemId | null {
  const live = markingSystemIds()
  const raw = params.explicit?.trim().toLowerCase()
  if (raw && isExamSystemId(raw) && live.has(raw)) return raw
  const code = params.subjectCode?.trim()
  if (!code) return null
  const board = resolveBoard(code)
  return live.has(board) ? board : null
}
