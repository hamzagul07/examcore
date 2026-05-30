export type UserRole = 'student' | 'teacher'

export type UserStage = 'as_level' | 'a2_level' | 'other'
export type PrimaryGoal = 'mark_papers' | 'track_progress' | 'essay_feedback'

export interface UserProfile {
  id: string
  full_name: string | null
  board: string | null
  level: string | null
  subjects: string[] | null
  onboarded: boolean
  onboarding_completed: boolean
  stage: UserStage | null
  primary_goal: PrimaryGoal | null
  celebrations_seen: string[] | null
  role: UserRole
  created_at?: string
  updated_at?: string
}

export interface Classroom {
  id: string
  teacher_id: string
  name: string
  description: string | null
  invite_code: string
  board: string
  level: string
  subject: string
  created_at: string
  updated_at: string
}

export interface ClassroomMembership {
  classroom_id: string
  student_id: string
  joined_at: string
}

export interface TeacherOverride {
  id: string
  attempt_id: string
  teacher_id: string
  original_marks_awarded: unknown
  override_marks_awarded: unknown
  override_total_earned: number
  teacher_notes: string | null
  created_at: string
}

export interface InterventionTest {
  id: string
  classroom_id: string
  teacher_id: string
  target_syllabus_codes: string[]
  question_ids: string[]
  title: string
  created_at: string
}
