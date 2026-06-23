/**
 * Shared option lists for onboarding + account settings. Single source of
 * truth — keeps the API validation and the UI in sync.
 *
 * `enabled: true` — selectable in onboarding/account.
 * `markingEnabled: true` — live marking on /mark.
 */

import { IB_MARKING_PROFILES } from '@/lib/ib/marking-config'

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
  { id: 'IB', label: 'IB', enabled: false },
]

export const LEVELS: ProfileOption[] = [
  { id: 'AS Level', label: 'AS Level', enabled: true },
  { id: 'A-Level', label: 'A-Level', enabled: true },
  { id: 'IGCSE', label: 'IGCSE', enabled: true },
  { id: 'O-Level', label: 'O-Level', enabled: true },
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

const SUBJECT_BY_CODE = new Map(SUBJECTS.map((s) => [s.code, s]))

export function getSubjectById(
  id: string,
  level?: string
): SubjectOption | undefined {
  const candidates = SUBJECTS.filter((s) => s.id === id)
  if (candidates.length === 0) return undefined
  if (level) {
    const match = candidates.find((s) => s.levels.includes(level))
    if (match) return match
  }
  return candidates[0]
}

export function getSubjectByCode(code: string): SubjectOption | undefined {
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
  return SUBJECTS.some((s) => s.id === id && s.enabled && s.levels.includes(level))
}

/** Names accepted by onboarding/account API */
export const SELECTABLE_SUBJECT_IDS = new Set(
  SUBJECTS.filter((s) => s.enabled).map((s) => s.id)
)

/** @deprecated use SELECTABLE_SUBJECT_IDS — kept for minimal diff at call sites */
export const ENABLED_SUBJECT_IDS = SELECTABLE_SUBJECT_IDS

export const MARKING_ENABLED_SUBJECT_CODES = new Set(
  SUBJECTS.filter((s) => s.markingEnabled).map((s) => s.code)
)

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
