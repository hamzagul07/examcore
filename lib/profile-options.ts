/**
 * Shared option lists for onboarding + account settings. Single source of
 * truth — keeps the API validation and the UI in sync.
 *
 * `enabled: true` — selectable in onboarding/account.
 * `markingEnabled: true` — live marking on /mark.
 */

import { IB_MARKING_PROFILES, type IbMarkingProfile } from '@/lib/ib/marking-config'

export type ProfileOption = {
  id: string
  label: string
  enabled: boolean
}

export type MarkingType = 'point_based' | 'level_of_response' | 'mixed'

export type SubjectOption = {
  /** Stored in user_profiles.subjects (display name) */
  id: string
  label: string
  code: string
  group: string
  /** Which profile levels this entry applies to */
  levels: string[]
  enabled: boolean
  markingEnabled: boolean
  markingType: MarkingType
}

export const BOARDS: ProfileOption[] = [
  { id: 'Cambridge International', label: 'Cambridge International', enabled: true },
  { id: 'Edexcel', label: 'Edexcel', enabled: false },
  { id: 'AQA', label: 'AQA', enabled: false },
  { id: 'IB', label: 'IB Diploma', enabled: true },
]

export const IB_BOARD_ID = 'IB'
export const IB_DIPLOMA_LEVEL = 'IB Diploma'

export const LEVELS: ProfileOption[] = [
  { id: 'AS Level', label: 'AS Level', enabled: true },
  { id: 'A-Level', label: 'A-Level', enabled: true },
  { id: 'IGCSE', label: 'IGCSE', enabled: true },
  { id: 'O-Level', label: 'O-Level', enabled: true },
  { id: IB_DIPLOMA_LEVEL, label: 'IB Diploma (HL & SL)', enabled: true },
]

export const SUBJECTS: SubjectOption[] = [
  {
    id: 'Mathematics',
    label: 'Mathematics',
    code: '9709',
    group: 'Mathematics',
    levels: ['AS Level', 'A-Level'],
    enabled: true,
    markingEnabled: true,
    markingType: 'point_based',
  },
  {
    id: 'Further Mathematics',
    label: 'Further Mathematics',
    code: '9231',
    group: 'Mathematics',
    levels: ['AS Level', 'A-Level'],
    enabled: true,
    markingEnabled: true,
    markingType: 'point_based',
  },
  {
    id: 'Mathematics',
    label: 'Mathematics',
    code: '4024',
    group: 'Mathematics',
    levels: ['O-Level'],
    enabled: true,
    markingEnabled: true,
    markingType: 'point_based',
  },
  {
    id: 'Additional Mathematics',
    label: 'Additional Mathematics',
    code: '4037',
    group: 'Mathematics',
    levels: ['O-Level'],
    enabled: true,
    markingEnabled: true,
    markingType: 'point_based',
  },
  {
    id: 'Biology',
    label: 'Biology',
    code: '9700',
    group: 'Sciences',
    levels: ['AS Level', 'A-Level'],
    enabled: true,
    markingEnabled: true,
    markingType: 'point_based',
  },
  {
    id: 'Biology',
    label: 'Biology',
    code: '5090',
    group: 'Sciences',
    levels: ['O-Level'],
    enabled: true,
    markingEnabled: true,
    markingType: 'point_based',
  },
  {
    id: 'Chemistry',
    label: 'Chemistry',
    code: '9701',
    group: 'Sciences',
    levels: ['AS Level', 'A-Level'],
    enabled: true,
    markingEnabled: true,
    markingType: 'point_based',
  },
  {
    id: 'Chemistry',
    label: 'Chemistry',
    code: '5070',
    group: 'Sciences',
    levels: ['O-Level'],
    enabled: true,
    markingEnabled: true,
    markingType: 'point_based',
  },
  {
    id: 'Physics',
    label: 'Physics',
    code: '9702',
    group: 'Sciences',
    levels: ['AS Level', 'A-Level'],
    enabled: true,
    markingEnabled: true,
    markingType: 'point_based',
  },
  {
    id: 'Physics',
    label: 'Physics',
    code: '5054',
    group: 'Sciences',
    levels: ['O-Level'],
    enabled: true,
    markingEnabled: true,
    markingType: 'point_based',
  },
  {
    id: 'Economics',
    label: 'Economics',
    code: '9708',
    group: 'Business & Economics',
    levels: ['AS Level', 'A-Level'],
    enabled: true,
    markingEnabled: true,
    markingType: 'mixed',
  },
  {
    id: 'Economics',
    label: 'Economics',
    code: '2281',
    group: 'Business & Economics',
    levels: ['O-Level'],
    enabled: true,
    markingEnabled: true,
    markingType: 'mixed',
  },
  {
    id: 'Business',
    label: 'Business',
    code: '9609',
    group: 'Business & Economics',
    levels: ['AS Level', 'A-Level'],
    enabled: true,
    markingEnabled: true,
    markingType: 'mixed',
  },
  {
    id: 'Business Studies',
    label: 'Business Studies',
    code: '7115',
    group: 'Business & Economics',
    levels: ['O-Level'],
    enabled: true,
    markingEnabled: true,
    markingType: 'mixed',
  },
  {
    id: 'Accounting',
    label: 'Accounting',
    code: '9706',
    group: 'Business & Economics',
    levels: ['AS Level', 'A-Level'],
    enabled: true,
    markingEnabled: true,
    markingType: 'point_based',
  },
  {
    id: 'Accounting',
    label: 'Accounting',
    code: '7707',
    group: 'Business & Economics',
    levels: ['O-Level'],
    enabled: true,
    markingEnabled: true,
    markingType: 'point_based',
  },
  {
    id: 'History',
    label: 'History',
    code: '9489',
    group: 'Humanities & Social Sciences',
    levels: ['AS Level', 'A-Level'],
    enabled: true,
    markingEnabled: true,
    markingType: 'level_of_response',
  },
  {
    id: 'Sociology',
    label: 'Sociology',
    code: '9699',
    group: 'Humanities & Social Sciences',
    levels: ['AS Level', 'A-Level'],
    enabled: true,
    markingEnabled: true,
    markingType: 'level_of_response',
  },
  {
    id: 'Psychology',
    label: 'Psychology',
    code: '9990',
    group: 'Humanities & Social Sciences',
    levels: ['AS Level', 'A-Level'],
    enabled: true,
    markingEnabled: true,
    markingType: 'mixed',
  },
  {
    id: 'Law',
    label: 'Law',
    code: '9084',
    group: 'Humanities & Social Sciences',
    levels: ['AS Level', 'A-Level'],
    enabled: true,
    markingEnabled: true,
    markingType: 'level_of_response',
  },
  {
    id: 'Islamic Studies',
    label: 'Islamic Studies',
    code: '9488',
    group: 'Humanities & Social Sciences',
    levels: ['AS Level', 'A-Level'],
    enabled: true,
    markingEnabled: true,
    markingType: 'level_of_response',
  },
  {
    id: 'Literature in English',
    label: 'Literature in English',
    code: '9695',
    group: 'Humanities & Social Sciences',
    levels: ['AS Level', 'A-Level'],
    enabled: true,
    markingEnabled: true,
    markingType: 'level_of_response',
  },
  {
    id: 'Computer Science',
    label: 'Computer Science',
    code: '9618',
    group: 'Computing',
    levels: ['AS Level', 'A-Level'],
    enabled: true,
    markingEnabled: true,
    markingType: 'point_based',
  },
  {
    id: 'Computer Science',
    label: 'Computer Science',
    code: '2210',
    group: 'Computing',
    levels: ['O-Level'],
    enabled: true,
    markingEnabled: true,
    markingType: 'point_based',
  },
  {
    id: 'Media Studies',
    label: 'Media Studies',
    code: '9607',
    group: 'Media',
    levels: ['AS Level', 'A-Level'],
    enabled: true,
    markingEnabled: true,
    markingType: 'level_of_response',
  },
]

export const SUBJECT_GROUPS = [
  'Mathematics',
  'Sciences',
  'Business & Economics',
  'Humanities & Social Sciences',
  'Computing',
  'Media',
] as const

export const IB_SUBJECT_GROUP_ORDER = [
  'Core',
  'Studies in Language and Literature',
  'Language Acquisition',
  'Individuals and Societies',
  'Sciences',
  'Mathematics',
  'The Arts',
] as const

function ibMarkingType(p: IbMarkingProfile): MarkingType {
  if (p.practiceStyle === 'level_of_response') return 'level_of_response'
  if (p.practiceStyle === 'mixed') return 'mixed'
  return 'point_based'
}

function ibSubjectLabel(p: IbMarkingProfile): string {
  return p.level === 'Core' ? p.name : `${p.name} ${p.level}`
}

export const IB_SUBJECT_OPTIONS: SubjectOption[] = IB_MARKING_PROFILES.map((p) => ({
  id: p.code,
  label: ibSubjectLabel(p),
  code: p.code,
  group: p.group,
  levels: [IB_DIPLOMA_LEVEL],
  enabled: true,
  markingEnabled: true,
  markingType: ibMarkingType(p),
}))

const IB_SUBJECT_BY_ID = new Map(IB_SUBJECT_OPTIONS.map((s) => [s.id, s]))

export function isIbBoard(board: string): boolean {
  return board === IB_BOARD_ID
}

export function ibSubjectsInGroup(group: string): SubjectOption[] {
  return IB_SUBJECT_OPTIONS.filter((s) => s.group === group && s.enabled)
}

export function ibSubjectGroups(): string[] {
  const present = new Set(IB_SUBJECT_OPTIONS.map((s) => s.group))
  return IB_SUBJECT_GROUP_ORDER.filter((g) => present.has(g))
}

export function getIbSubjectOption(code: string): SubjectOption | undefined {
  return IB_SUBJECT_BY_ID.get(code)
}

export function isIbSubjectId(id: string): boolean {
  return IB_SUBJECT_BY_ID.has(id)
}

export function isSubjectValidForIb(id: string): boolean {
  return isIbSubjectId(id)
}

const SUBJECT_BY_CODE = new Map(SUBJECTS.map((s) => [s.code, s]))

export function getSubjectById(
  id: string,
  level?: string
): SubjectOption | undefined {
  const ib = getIbSubjectOption(id)
  if (ib) return ib

  const candidates = SUBJECTS.filter((s) => s.id === id)
  if (candidates.length === 0) return undefined
  if (level && level !== IB_DIPLOMA_LEVEL) {
    const match = candidates.find((s) => s.levels.includes(level))
    if (match) return match
  }
  return candidates[0]
}

export function getSubjectByCode(code: string): SubjectOption | undefined {
  const ib = getIbSubjectOption(code)
  if (ib) return ib
  return SUBJECT_BY_CODE.get(code)
}

export function subjectsInGroup(group: string, level?: string): SubjectOption[] {
  return SUBJECTS.filter(
    (s) =>
      s.group === group &&
      s.enabled &&
      (!level || s.levels.includes(level))
  )
}

export function subjectsForLevel(level: string): SubjectOption[] {
  return SUBJECTS.filter((s) => s.enabled && s.levels.includes(level))
}

export function isSubjectValidForLevel(id: string, level: string): boolean {
  if (level === IB_DIPLOMA_LEVEL) {
    return isSubjectValidForIb(id)
  }
  return SUBJECTS.some((s) => s.id === id && s.enabled && s.levels.includes(level))
}

/** Validates a stored subject id for the user's board + level. */
export function isSubjectValidForProfile(
  board: string,
  level: string,
  subjectId: string
): boolean {
  if (isIbBoard(board)) {
    return level === IB_DIPLOMA_LEVEL && isSubjectValidForIb(subjectId)
  }
  if (isIbSubjectId(subjectId)) return false
  return isSubjectValidForLevel(subjectId, level)
}

export function levelsForBoard(board: string): ProfileOption[] {
  if (isIbBoard(board)) {
    return LEVELS.filter((l) => l.id === IB_DIPLOMA_LEVEL && l.enabled)
  }
  return LEVELS.filter((l) => l.id !== IB_DIPLOMA_LEVEL && l.enabled)
}

/** Names accepted by onboarding/account API */
export const SELECTABLE_SUBJECT_IDS = new Set([
  ...SUBJECTS.filter((s) => s.enabled).map((s) => s.id),
  ...IB_SUBJECT_OPTIONS.filter((s) => s.enabled).map((s) => s.id),
])

/** @deprecated use SELECTABLE_SUBJECT_IDS — kept for minimal diff at call sites */
export const ENABLED_SUBJECT_IDS = SELECTABLE_SUBJECT_IDS

export const MARKING_ENABLED_SUBJECT_CODES = new Set([
  ...SUBJECTS.filter((s) => s.markingEnabled).map((s) => s.code),
  ...IB_SUBJECT_OPTIONS.filter((s) => s.markingEnabled).map((s) => s.code),
])

export const SUBJECT_CODE_MAP: Record<string, string> = {
  ...Object.fromEntries(SUBJECTS.map((s) => [s.code, s.label])),
  ...Object.fromEntries(IB_MARKING_PROFILES.map((p) => [p.code, p.name])),
}

export const ENABLED_BOARD_IDS = new Set(
  BOARDS.filter((b) => b.enabled).map((b) => b.id)
)
export const ENABLED_LEVEL_IDS = new Set(
  LEVELS.filter((l) => l.enabled).map((l) => l.id)
)

export const DEFAULT_BOARD = 'Cambridge International'
export const DEFAULT_LEVEL = 'A-Level'
export const DEFAULT_SUBJECTS = ['Mathematics']

/** Fallback subject ids when profile.subjects is empty — board-aware. */
export function defaultSubjectsForProfile(board: string, level: string): string[] {
  if (isIbBoard(board) || level === IB_DIPLOMA_LEVEL) {
    const first = IB_SUBJECT_OPTIONS.find((s) => s.enabled)
    return first ? [first.id] : ['ib-biology-hl']
  }
  return DEFAULT_SUBJECTS
}

/** Fallback mark subject code when profile codes cannot be resolved. */
export function defaultMarkSubjectCode(level: string): string {
  if (level === IB_DIPLOMA_LEVEL) {
    return IB_SUBJECT_OPTIONS.find((s) => s.enabled)?.code ?? 'ib-biology-hl'
  }
  if (level === 'O-Level') return '4024'
  return '9709'
}
