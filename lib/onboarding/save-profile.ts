import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'
import {
  ENABLED_BOARD_IDS,
  ENABLED_LEVEL_IDS,
  isSubjectValidForLevel,
} from '@/lib/profile-options'
import type { PrimaryGoal, UserRole, UserStage } from '@/lib/database.types'

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
  const role: UserRole = body.role === 'teacher' ? 'teacher' : 'student'
  const board = (body.board || '').trim() || 'Cambridge International'
  const level = (body.level || '').trim() || 'A-Level'
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
      if (!isSubjectValidForLevel(s, level)) {
        return {
          ok: false,
          error: `Subject "${s}" is not supported for ${level} yet.`,
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
  const { error } = await service.from('user_profiles').upsert(
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
    console.error('[onboarding] upsert failed:', error)
    return {
      ok: false,
      error: 'Could not save your profile. Try again in a moment.',
      status: 500,
    }
  }

  await service.from('user_subscriptions').upsert(
    {
      user_id: userId,
      founding_member: true,
    },
    { onConflict: 'user_id' }
  )

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

  return { ok: true, role }
}
