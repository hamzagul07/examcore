import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import {
  buildProfileCompletionEmail,
  type ProfileCompletionPayload,
} from '@/lib/email/profile-completion'
import { sendEmail } from '@/lib/email/send'
import { getSubjectById } from '@/lib/profile-options'
import { buildVaultDiagramTheatre } from '@/lib/max/vault-diagram-showcase'
import { loadVaultIbAssessment } from '@/lib/max/vault-ib-assessment'
import { tierMarketingName } from '@/lib/billing/caps'
import type { SubscriptionTier } from '@/lib/database.types'

/**
 * Day-0 email for a new Scholar: what is already in their Vault, and the two
 * profile fields that decide how much of it they actually see.
 *
 * Max has had a welcome, a Vault tour, a day-4 nudge and a sprint grant since
 * launch. Scholar had a one-line "your plan is now active" receipt, so someone
 * paid and then had to find the Vault on their own — and a Scholar who never
 * opens it has bought a marking quota, which is the version of this product
 * worth the least and easiest to cancel.
 *
 * The Vault claims are read from that student's own data, so this cannot
 * promise a desk that is not there.
 */

/** Subject counts stated as fact only where we know them. */
const EXPECTED_SUBJECTS: Record<string, number> = {
  'IB Diploma': 6,
}

export async function buildScholarVaultPayload(
  supabase: SupabaseClient,
  userId: string,
  to: string,
  opts: { recipientName?: string | null; planLabel?: string | null } = {}
): Promise<ProfileCompletionPayload | null> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, subjects, level, board, exam_date')
    .eq('id', userId)
    .maybeSingle()
  if (!profile) return null

  const subjects = (profile.subjects as string[] | null) ?? []
  const level = (profile.level as string | null) ?? null

  const primary = subjects[0] ?? null
  const primaryOpt = primary ? getSubjectById(primary, level ?? undefined) : null
  const primaryCode = primaryOpt?.code ?? primary

  let vault: ProfileCompletionPayload['vault'] = null
  if (primaryCode) {
    const theatre = buildVaultDiagramTheatre(primaryCode, primaryOpt?.label ?? null)
    const assessment = await loadVaultIbAssessment(primaryCode).catch(() => null)
    const head = assessment?.headline ?? null
    const top = head
      ? ([...head.criteria].sort((a, b) => b.maxMarks - a.maxMarks)[0] ?? null)
      : null
    vault = {
      subjectLabel: primaryOpt?.label ?? theatre?.subjectLabel ?? null,
      diagrams: theatre?.catalogCount ?? 0,
      signature: theatre?.signature?.title ?? null,
      assessmentLabel: head?.label ?? null,
      assessmentMarks: head?.maxMarks ?? null,
      topCriterion: top
        ? { letter: top.letter, name: top.name, marks: top.maxMarks, share: top.share }
        : null,
    }
  }

  return {
    to,
    recipientName:
      opts.recipientName ?? ((profile.full_name as string | null)?.trim() || null),
    subjects,
    level,
    board: (profile.board as string | null) ?? null,
    hasExamDate: Boolean(profile.exam_date),
    expectedSubjects: EXPECTED_SUBJECTS[String(level ?? '')] ?? null,
    planLabel: opts.planLabel ?? null,
    vault,
  }
}

/**
 * Claim-then-send, so a webhook retry or a second `subscription.active` cannot
 * mail the same person twice. Mirrors the Max gift claim: the insert is the
 * lock, and losing the race simply means somebody else already sent it.
 */
async function claimWelcome(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { error } = await supabase.from('usage_events').insert({
    user_id: userId,
    event_type: 'credit_grant',
    credits_delta: 0,
    source: 'admin_grant',
    metadata: {
      polar_order_id: `scholar-vault-welcome-${userId}-notified`,
      product: 'scholar_vault_welcome',
      source: 'scholar_welcome_email_claim',
    },
  })
  return !error
}

/** Call when Polar syncs Scholar on subscription.active. */
export async function sendScholarVaultWelcome(
  supabase: SupabaseClient,
  userId: string,
  tier: SubscriptionTier
): Promise<void> {
  const { data: authData } = await supabase.auth.admin.getUserById(userId)
  const email = authData?.user?.email
  if (!email) return

  // The signup name is whatever the provider handed over and is not always what
  // the person goes by. Rather than risk greeting a paying customer by the
  // wrong name, the email addresses them by plan when there is no name on the
  // profile itself — which the student typed.
  const payload = await buildScholarVaultPayload(supabase, userId, email, {
    planLabel: tierMarketingName(tier),
  })
  if (!payload) return

  if (!(await claimWelcome(supabase, userId))) return

  const { subject, html, text } = buildProfileCompletionEmail(payload)
  await sendEmail({ to: email, subject, html, text })
}
