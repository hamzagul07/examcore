import { aqaExamSystem } from '@/lib/exam-systems/adapters/aqa'
import { apExamSystem } from '@/lib/exam-systems/adapters/ap'
import { caieExamSystem } from '@/lib/exam-systems/adapters/caie'
import { edexcelExamSystem } from '@/lib/exam-systems/adapters/edexcel'
import { ibExamSystem } from '@/lib/exam-systems/adapters/ib'
import { oxfordaqaExamSystem } from '@/lib/exam-systems/adapters/oxfordaqa'
import type { ExamSystem, ExamSystemId } from '@/lib/exam-systems/types'

const EXAM_SYSTEMS: Record<ExamSystemId, ExamSystem> = {
  cambridge: caieExamSystem,
  ib: ibExamSystem,
  edexcel: edexcelExamSystem,
  oxfordaqa: oxfordaqaExamSystem,
  aqa: aqaExamSystem,
  ap: apExamSystem,
}

/**
 * Subject-code resolve order: specific boards before IB's non-numeric catch-all.
 * When Edexcel starts owning WMA* codes, list it here before `ib`.
 */
const SUBJECT_RESOLVE_ORDER: ExamSystemId[] = [
  'cambridge',
  'edexcel',
  'oxfordaqa',
  'aqa',
  'ap',
  'ib',
]

export function getExamSystem(id: ExamSystemId): ExamSystem {
  return EXAM_SYSTEMS[id]
}

export function listExamSystems(): ExamSystem[] {
  return SUBJECT_RESOLVE_ORDER.map((id) => EXAM_SYSTEMS[id])
}

export function listEnabledExamSystems(): ExamSystem[] {
  return listExamSystems().filter((s) => s.enabled)
}

export function listMarkingExamSystems(): ExamSystem[] {
  return listExamSystems().filter((s) => s.markingEnabled)
}

export function getExamSystemByProfileBoardId(profileBoardId: string): ExamSystem | null {
  return listExamSystems().find((s) => s.profileBoardId === profileBoardId) ?? null
}

/**
 * Resolve which exam system owns a subject content/catalog code.
 * `explicit` wins when a route already knows the board (e.g. /ib/...).
 */
export function resolveExamSystemForSubject(
  code: string,
  explicit?: ExamSystemId
): ExamSystem {
  if (explicit) return getExamSystem(explicit)
  const trimmed = code.trim()
  for (const id of SUBJECT_RESOLVE_ORDER) {
    const sys = EXAM_SYSTEMS[id]
    if (sys.ownsSubjectCode(trimmed)) return sys
  }
  // Defensive fallback — IB catch-all should always match non-numeric codes.
  return ibExamSystem
}

export function isExamSystemId(value: string): value is ExamSystemId {
  return value in EXAM_SYSTEMS
}
