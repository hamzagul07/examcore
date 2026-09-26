/**
 * The subject list on the one-screen teacher setup form
 * (components/TeacherStartForm.tsx), grouped for <optgroup>s.
 *
 * Each board keeps its subjects in a different catalogue — Cambridge in
 * SUBJECTS (per level), IB in IB_SUBJECT_OPTIONS, Edexcel units in their own
 * list, OxfordAQA / AQA / AP in the content catalogues — so asking
 * `subjectsForLevel('IB Diploma')` returns nothing and an IB teacher could not
 * finish setup. This goes through the same group helpers as the student
 * onboarding wizard, then keeps only the options lib/onboarding/save-profile.ts
 * will accept (`isSubjectValidForProfile`), so the form can never offer a
 * subject the server then rejects.
 *
 * Pure and client-safe.
 */

import {
  SUBJECT_GROUPS,
  catalogBoardSubjectGroups,
  catalogBoardSubjectsInGroup,
  edexcelSubjectGroups,
  edexcelSubjectsInGroup,
  ibSubjectGroups,
  ibSubjectsInGroup,
  isCatalogBoard,
  isEdexcelBoard,
  isIbBoard,
  isSubjectValidForProfile,
  levelsForBoard,
  subjectsInGroup,
  type ProfileOption,
  type SubjectOption,
} from '@/lib/profile-options'

export type StartSubjectGroup = { group: string; options: SubjectOption[] }

/**
 * The levels a teacher of this board can pick (IB has just the Diploma).
 * A level with nothing to teach in the catalogue yet (Cambridge IGCSE today)
 * is left out rather than offered with an empty subject list.
 */
export function startLevels(board: string): ProfileOption[] {
  return levelsForBoard(board).filter((l) => startSubjectGroups(board, l.id).length > 0)
}

/**
 * The level to submit for a board: the chosen one when the board offers it,
 * otherwise the board's first level (IB → 'IB Diploma', AP/AQA → AS/A-Level).
 */
export function startLevelFor(board: string, level: string): string {
  const levels = startLevels(board)
  if (levels.some((l) => l.id === level)) return level
  return levels.find((l) => l.id === 'A-Level')?.id ?? levels[0]?.id ?? level
}

/** Subjects for a board + level, grouped, each one accepted by save-profile. */
export function startSubjectGroups(board: string, level: string): StartSubjectGroup[] {
  const ib = isIbBoard(board)
  const edexcel = isEdexcelBoard(board)
  const catalog = isCatalogBoard(board)
  const groups: readonly string[] = ib
    ? ibSubjectGroups()
    : edexcel
      ? edexcelSubjectGroups()
      : catalog
        ? catalogBoardSubjectGroups(board)
        : SUBJECT_GROUPS

  const seen = new Set<string>()
  const out: StartSubjectGroup[] = []
  for (const group of groups) {
    const raw = ib
      ? ibSubjectsInGroup(group)
      : edexcel
        ? edexcelSubjectsInGroup(group)
        : catalog
          ? catalogBoardSubjectsInGroup(board, group)
          : subjectsInGroup(group, level)
    const options = raw.filter((s) => {
      if (seen.has(s.id) || !isSubjectValidForProfile(board, level, s.id)) return false
      seen.add(s.id)
      return true
    })
    if (options.length > 0) out.push({ group, options })
  }
  return out
}
