export type UserStage = 'as_level' | 'a2_level' | 'other'
export type PrimaryGoal = 'mark_papers' | 'track_progress' | 'essay_feedback'
export type CelebrationKey =
  | 'onboarding_complete'
  | 'first_mark'
  | 'first_exam_ready'

export function isOnboardingComplete(profile: {
  onboarding_completed?: boolean | null
  onboarded?: boolean | null
} | null): boolean {
  if (!profile) return false
  return profile.onboarding_completed === true || profile.onboarded === true
}
