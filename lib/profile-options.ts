/**
 * Shared option lists for onboarding + account settings. Single source of
 * truth — keeps the API validation and the UI in sync.
 *
 * `enabled: false` items render as locked/coming-soon and are rejected by the
 * API. Adding board/subject/level support is a one-line flip here.
 */

export type ProfileOption = {
  id: string
  label: string
  enabled: boolean
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

export const SUBJECTS: ProfileOption[] = [
  { id: 'Mathematics', label: 'Mathematics', enabled: true },
  { id: 'Physics', label: 'Physics', enabled: false },
  { id: 'Chemistry', label: 'Chemistry', enabled: false },
  { id: 'Biology', label: 'Biology', enabled: false },
  { id: 'Economics', label: 'Economics', enabled: false },
  { id: 'English Literature', label: 'English Literature', enabled: false },
]

export const ENABLED_BOARD_IDS = new Set(
  BOARDS.filter((b) => b.enabled).map((b) => b.id)
)
export const ENABLED_LEVEL_IDS = new Set(
  LEVELS.filter((l) => l.enabled).map((l) => l.id)
)
export const ENABLED_SUBJECT_IDS = new Set(
  SUBJECTS.filter((s) => s.enabled).map((s) => s.id)
)

export const DEFAULT_BOARD = 'Cambridge International'
export const DEFAULT_LEVEL = 'A-Level'
export const DEFAULT_SUBJECTS = ['Mathematics']
