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
  exam_date: string | null
  target_grade?: string | null
  role: UserRole
  email_exam_reminders?: boolean
  email_product_updates?: boolean
  /**
   * Set only by the service role; grants the free teacher allowance. Distinct
   * from `role`, which merely selects the teacher UI and is chosen by the user
   * during onboarding — see lib/billing/access.ts.
   */
  teacher_verified_at?: string | null
  teacher_verified_reason?: string | null
  created_at?: string
  updated_at?: string
}

export interface CourseProgressRow {
  user_id: string
  progress: Record<string, Record<string, boolean>>
  last_lesson: { code: string; slug: string } | null
  updated_at: string
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

/** One browsing session's first-touch attribution. Service-role only. */
export interface VisitSession {
  session_id: string
  first_seen_at: string
  last_seen_at: string
  landing_path: string | null
  referrer: string | null
  referrer_host: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  /** 'organic' | 'ai-assistant' | 'social' | 'school' | 'referral' | 'email' | 'paid' | 'direct' */
  channel: string
  user_id: string | null
  converted_at: string | null
  pageviews: number
}

/** A school being approached in the teacher-outreach campaign. Service-role only. */
export interface OutreachTarget {
  id: string
  school: string
  slug: string
  country: string | null
  board: string | null
  subject: string | null
  contact_name: string | null
  contact_email: string | null
  contact_role: string | null
  website: string | null
  status:
    | 'queued'
    | 'sent'
    | 'bounced'
    | 'replied'
    | 'trialing'
    | 'signed_up'
    | 'linked'
    | 'declined'
  sent_at: string | null
  replied_at: string | null
  linked_at: string | null
  linked_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

/** Schools on non-education TLDs, so their referrals reach the school channel. */
export interface SchoolHost {
  host: string
  note: string | null
  created_at: string
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
  polar_customer_id: string | null
  polar_subscription_id: string | null
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
