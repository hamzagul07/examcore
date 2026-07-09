import type { PrimaryGoal, UserStage } from '@/lib/database.types'
import type { EnforcementMode } from '@/lib/billing/enforcement-mode'

export type SettingsProfile = {
  full_name: string
  username: string
  board: string
  level: string
  subjects: string[]
  exam_date: string
  stage: UserStage | null
  primary_goal: PrimaryGoal | null
  created_at: string | null
}

export type SettingsUsageRow = {
  id: string
  eventType: string
  source: string
  creditsDelta: number
  createdAt: string
}

export type SettingsBilling = {
  tier: string
  status: string
  billingPeriod: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  hasCustomer: boolean
  credits: number
  marksUsed: number
  markCap: number
  omniUsed: number
  omniCap: number
  periodResetsAt: string | null
  enforcementMode: EnforcementMode
  questionsWarning: boolean
  questionsBlocked: boolean
  omniWarning: boolean
  omniBlocked: boolean
  recentUsage: SettingsUsageRow[]
}

export type SettingsContext = {
  email: string
  profile: SettingsProfile
  billing: SettingsBilling
  notifications: {
    emailExamReminders: boolean
    emailProductUpdates: boolean
    emailCommunityReplies: boolean
    emailCommunityDigest: boolean
    emailCommunityThreads: boolean
    emailReviewDigest: boolean
  }
}
