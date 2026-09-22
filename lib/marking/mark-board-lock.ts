import {
  getExamSystem,
  getExamSystemByProfileBoardId,
  type ExamSystemId,
} from '@/lib/exam-systems'

/**
 * Who chooses the board on /mark.
 *
 * A signed-in student already told us their board in onboarding, so the mark
 * desk marks on that board and never shows the six-board grid. Guests, accounts
 * with no board yet, and boards whose marking pack is switched off still pick.
 *
 * Deep links (`/mark?board=ib`) and in-app handoffs from another board's course
 * still move the desk programmatically — the locked line then says so and
 * offers the way back to the profile board, instead of re-opening the grid.
 */
export type MarkBoardLock =
  | { mode: 'picker' }
  | {
      mode: 'locked'
      /** Board the desk is marking on right now. */
      board: ExamSystemId
      /** Board on the student's profile (`user_profiles.board`, resolved). */
      profileBoard: ExamSystemId
      /** A deep link or handoff moved the desk off the profile board. */
      overridden: boolean
    }

export function resolveMarkBoardLock(input: {
  /** `user_profiles.board` — e.g. "Cambridge International". Null for guests. */
  profileBoard: string | null | undefined
  /** Board currently selected on the desk. */
  selectedBoard: ExamSystemId
}): MarkBoardLock {
  const raw = input.profileBoard?.trim()
  if (!raw) return { mode: 'picker' }

  const profileSystem = getExamSystemByProfileBoardId(raw)
  if (!profileSystem?.markingEnabled) return { mode: 'picker' }

  const selected = getExamSystem(input.selectedBoard)
  const board = selected?.markingEnabled ? selected.id : profileSystem.id

  return {
    mode: 'locked',
    board,
    profileBoard: profileSystem.id,
    overridden: board !== profileSystem.id,
  }
}
