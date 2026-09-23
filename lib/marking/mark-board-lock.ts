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
 *
 * Teachers keep the grid. A student sits one board; a teacher at an
 * international school may mark Cambridge in the morning and IB after lunch,
 * and a lock they can only escape through their own profile settings would
 * trap the people most likely to bring the next twenty students.
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

/**
 * The profile board as something worth caching for the pre-paint hint — or
 * null. Cache only what would actually lock: a board the registry does not
 * know, or whose marking pack is switched off, or a teacher's board, would
 * stamp the boot attribute and hide a grid that is about to show.
 */
export function lockableProfileBoard(
  board: string | null | undefined,
  role?: string | null
): string | null {
  const lock = resolveMarkBoardLock({
    profileBoard: board,
    selectedBoard: 'cambridge',
    role,
  })
  return lock.mode === 'locked' ? (board ?? '').trim() : null
}

export function resolveMarkBoardLock(input: {
  /** `user_profiles.board` — e.g. "Cambridge International". Null for guests. */
  profileBoard: string | null | undefined
  /** Board currently selected on the desk. */
  selectedBoard: ExamSystemId
  /** `user_profiles.role` — teachers are never locked. */
  role?: string | null
}): MarkBoardLock {
  if (input.role === 'teacher') return { mode: 'picker' }
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
