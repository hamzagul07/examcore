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
import { handleOnboardingCompleteEmails } from '@/lib/email/notifications'

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
    const subjects =
      role === 'teacher'
        ? ['Mathematics']
        : Array.isArray(body.subjects)
          ? Array.from(
              new Set(body.subjects.map((s) => String(s).trim()).filter(Boolean))
            )
          : []

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

    const service = createServiceClient()
    const { data: existingProfile } = await service
      .from('user_profiles')
      .select('onboarded, onboarding_completed')
      .eq('id', userId)
      .maybeSingle()
    const wasAlreadyOnboarded = isOnboardingComplete(existingProfile)

    const { error } = await userClient.from('user_profiles').upsert(
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

    // The subscription row is created by handle_new_user_billing() on signup —
    // free tier, no automatic trial.

    if (role === 'teacher') {
      const classroomName = (body.classroom_name || '').trim()
      if (!classroomName) {
        return { ok: false, error: 'Classroom name is required for teachers.', status: 400 }
      }

      const { error: classroomError } = await userClient.from('classrooms').insert({
        teacher_id: userId,
        name: classroomName.slice(0, 120),
        board,
        level,
        subject: 'Mathematics',
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
      void handleOnboardingCompleteEmails(service, userId, {
        full_name: fullName,
        level,
        subjects,
        primary_goal: primaryGoal,
      })
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
