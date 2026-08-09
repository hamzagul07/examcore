import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'
import {
  ENABLED_BOARD_IDS,
  ENABLED_LEVEL_IDS,
  IB_DIPLOMA_LEVEL,
  isIbBoard,
  isSubjectValidForProfile,
} from '@/lib/profile-options'
import type { PrimaryGoal, UserRole, UserStage } from '@/lib/database.types'
import { isOnboardingComplete } from '@/lib/onboarding'
import {
  isValidTargetGrade,
  targetGradeKindFromBoard,
} from '@/lib/target-grade'
import { handleOnboardingCompleteEmails } from '@/lib/email/notifications'
import { runAfterResponse } from '@/lib/after-response'

export type OnboardingInput = {
  full_name?: string | null
  board?: string
  level?: string
  subjects?: string[]
  role?: UserRole
  classroom_name?: string
  stage?: UserStage
  primary_goal?: PrimaryGoal
  exam_date?: string | null
  target_grade?: string | null
  /** Consent for non-essential mail, captured on the final onboarding step. */
  email_product_updates?: boolean
}

const VALID_STAGES = new Set<UserStage>(['as_level', 'a2_level', 'other'])
const VALID_GOALS = new Set<PrimaryGoal>([
  'mark_papers',
  'track_progress',
  'essay_feedback',
])

export type SaveOnboardingResult =
  | { ok: true; role: UserRole }
  | { ok: false; error: string; status: 400 | 401 | 500 }

export async function saveOnboardingProfile(
  userClient: SupabaseClient,
  userId: string,
  body: OnboardingInput
): Promise<SaveOnboardingResult> {
  try {
    const role: UserRole = body.role === 'teacher' ? 'teacher' : 'student'
    const board = (body.board || '').trim() || 'Cambridge International'
    let level = (body.level || '').trim() || 'A-Level'
    if (isIbBoard(board)) {
      level = IB_DIPLOMA_LEVEL
    }
    const requested = Array.isArray(body.subjects)
      ? Array.from(new Set(body.subjects.map((s) => String(s).trim()).filter(Boolean)))
      : []
    // A teacher teaches one subject here — the one their first classroom is for.
    // This used to be hardcoded to Mathematics, which handed every chemistry
    // teacher a maths class on the first screen they saw.
    const subjects = role === 'teacher' ? requested.slice(0, 1) : requested

    if (role === 'student') {
      if (!ENABLED_BOARD_IDS.has(board)) {
        return { ok: false, error: 'Pick a supported exam board.', status: 400 }
      }
      if (!ENABLED_LEVEL_IDS.has(level)) {
        return { ok: false, error: 'Pick a supported level.', status: 400 }
      }
      if (subjects.length === 0) {
        return { ok: false, error: 'Pick at least one subject.', status: 400 }
      }
      if (subjects.length > 4) {
        return { ok: false, error: 'Pick up to four subjects.', status: 400 }
      }
      for (const s of subjects) {
        if (!isSubjectValidForProfile(board, level, s)) {
          return {
            ok: false,
            error: `Subject "${s}" is not supported for ${board} ${level} yet.`,
            status: 400,
          }
        }
      }
    }

    const fullName =
      typeof body.full_name === 'string' && body.full_name.trim()
        ? body.full_name.trim().slice(0, 80)
        : null

    const stage = body.stage && VALID_STAGES.has(body.stage) ? body.stage : null
    const primaryGoal =
      body.primary_goal && VALID_GOALS.has(body.primary_goal)
        ? body.primary_goal
        : null

    let examDate: string | null = null
    if (typeof body.exam_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.exam_date)) {
      examDate = body.exam_date
    }

    // Validated against the board's own scale — a Cambridge 'A*' stored for an
    // IB student would silently break gapToTargetGrade, which looks the grade
    // up in GRADE_BOUNDARIES and returns null on a miss. Skipping is the right
    // failure: the target is optional and a wrong one is worse than none.
    const targetGrade =
      typeof body.target_grade === 'string' &&
      isValidTargetGrade(targetGradeKindFromBoard(board), body.target_grade)
        ? body.target_grade
        : null

    // Only written when the client actually sent a boolean. A rerun of the
    // wizard (or an older client) must not silently reset a choice the student
    // already made in settings.
    const productUpdates =
      typeof body.email_product_updates === 'boolean' ? body.email_product_updates : undefined

    const service = createServiceClient()
    const { data: existingProfile } = await service
      .from('user_profiles')
      .select('onboarded, onboarding_completed')
      .eq('id', userId)
      .maybeSingle()
    const wasAlreadyOnboarded = isOnboardingComplete(existingProfile)

    // `role` is deliberately absent here: the column grant is revoked from
    // `authenticated` so that a user cannot promote themselves to teacher, and
    // including it would make PostgREST reject the entire upsert. It is written
    // with the service client below, after the user id has been verified.
    const { error } = await userClient.from('user_profiles').upsert(
      {
        id: userId,
        full_name: fullName,
        board,
        level,
        subjects,
        stage,
        primary_goal: primaryGoal,
        exam_date: examDate,
        target_grade: targetGrade,
        ...(productUpdates === undefined ? {} : { email_product_updates: productUpdates }),
        onboarded: true,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

    if (error) {
      console.error('[onboarding] user upsert failed:', error)

      // Fallback when the user JWT did not reach PostgREST (common with some
      // server-action / cookie edge cases). Service role is safe here because
      // we already verified the authenticated user id server-side.
      try {
        const { error: serviceError } = await service.from('user_profiles').upsert(
          {
            id: userId,
            full_name: fullName,
            board,
            level,
            subjects,
            role,
            stage,
            primary_goal: primaryGoal,
            exam_date: examDate,
            target_grade: targetGrade,
            ...(productUpdates === undefined ? {} : { email_product_updates: productUpdates }),
            onboarded: true,
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )

        if (serviceError) {
          console.error('[onboarding] service upsert failed:', serviceError)
          return {
            ok: false,
            error: 'Could not save your profile. Try again in a moment.',
            status: 500,
          }
        }
      } catch (serviceErr) {
        console.error('[onboarding] service upsert threw:', serviceErr)
        return {
          ok: false,
          error: 'Could not save your profile. Try again in a moment.',
          status: 500,
        }
      }
    }

    // Role is written server-side, with the service client, because the column
    // is no longer writable by `authenticated` — that grant was what let anyone
    // promote themselves into the teacher UI. Safe here: the user id was
    // verified by the caller before this function was reached.
    //
    // Runs on both paths (the fallback above sets it too); an idempotent write
    // is cheaper than reasoning about which branch ran.
    const { error: roleError } = await service
      .from('user_profiles')
      .update({ role })
      .eq('id', userId)

    if (roleError) {
      console.error('[onboarding] role write failed:', roleError)
      return {
        ok: false,
        error: 'Could not save your profile. Try again in a moment.',
        status: 500,
      }
    }

    // The subscription row is created by handle_new_user_billing() on signup,
    // on the free tier. No upsert needed here.

    if (role === 'teacher') {
      const classroomName = (body.classroom_name || '').trim()
      if (!classroomName) {
        return { ok: false, error: 'Classroom name is required for teachers.', status: 400 }
      }
      const classroomSubject = subjects[0]
      if (!classroomSubject) {
        return { ok: false, error: 'Pick the subject you teach.', status: 400 }
      }

      const { error: classroomError } = await userClient.from('classrooms').insert({
        teacher_id: userId,
        name: classroomName.slice(0, 120),
        board,
        level,
        subject: classroomSubject,
      })

      if (classroomError) {
        console.error('[onboarding] classroom create failed:', classroomError)
        return {
          ok: false,
          error: 'Profile saved but classroom creation failed.',
          status: 500,
        }
      }
    }

    if (!wasAlreadyOnboarded) {
      runAfterResponse('onboarding-complete-emails', () =>
        handleOnboardingCompleteEmails(service, userId, {
          full_name: fullName,
          board,
          level,
          subjects,
          primary_goal: primaryGoal,
          target_grade: targetGrade,
        })
      )
    }

    return { ok: true, role }
  } catch (err) {
    console.error('[onboarding] unexpected error:', err)
    return {
      ok: false,
      error: 'Could not save your profile. Try again in a moment.',
      status: 500,
    }
  }
}
