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

// --- Billing (Sprint 42) ---

export type SubscriptionTier = 'free' | 'student' | 'scholar' | 'mastery'
export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'unpaid'
export type BillingPeriod = 'monthly' | 'yearly'
export type RegionTier = 'A' | 'B' | 'C'

export interface UserSubscription {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  tier: SubscriptionTier
  status: SubscriptionStatus
  billing_period: BillingPeriod | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  canceled_at: string | null
  currency: string
  region_tier: RegionTier
  founding_member: boolean
  created_at: string
  updated_at: string
}

export interface UserCredits {
  user_id: string
  balance: number
  total_purchased: number
  total_used: number
  updated_at: string
}

export type UsageEventType =
  | 'mark_single'
  | 'mark_whole_paper'
  | 'credit_topup'
  | 'credit_grant'
export type UsageSource = 'subscription' | 'credits' | 'free_tier' | 'admin_grant'

export interface UsageEvent {
  id: string
  user_id: string
  event_type: UsageEventType
  attempt_id: string | null
  credits_delta: number
  source: UsageSource
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface PricingConfigRow {
  id: string
  product_key: string
  region_tier: RegionTier
  currency: string
  amount_cents: number
  stripe_price_id: string
  billing_period: BillingPeriod | null
  is_active: boolean
}
