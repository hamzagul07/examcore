import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { sendEmail } from '@/lib/email/send'
import {
  EMAIL_BODY,
  EMAIL_MUTED,
  EMAIL_SERIF,
  escapeHtml as esc,
  renderBrandedEmailHtml,
} from '@/lib/email/templates'
import { SITE_URL } from '@/lib/site-config'
import { MAX_PROFILE_SUBJECTS } from '@/lib/profile-options'
import { tierMarketingName } from '@/lib/billing/caps'
import type { SubscriptionTier } from '@/lib/database.types'

/**
 * For someone who is paying and has never marked anything.
 *
 * Zero attempts on a paid account is the strongest churn signal there is: they
 * decided the product was worth money and then never used it once, so every
 * renewal is a chance to notice. Nothing here is about features — the only ask
 * is the single action the rest of the product is built on top of.
 *
 * Kept deliberately short. A long email to someone who has not started reads as
 * a reason not to start.
 */

export type PaidActivationPayload = {
  to: string
  /** Name, or the plan when there is no name we trust. */
  address?: string | null
  /** Their subject count, so the second ask can be specific or omitted. */
  subjectCount?: number
  /** How many subjects this qualification usually involves. */
  expectedSubjects?: number | null
  levelLabel?: string | null
}

const SUBJECTS_HREF = `${SITE_URL}/onboarding?rerun=1`

export function buildPaidActivationEmail(payload: PaidActivationPayload): {
  subject: string
  html: string
  text: string
} {
  const greeting = payload.address ? `Hi ${esc(payload.address)},` : 'Hi,'
  const para = (inner: string, muted = false) =>
    `<p style="margin:0 0 18px;font-family:${EMAIL_SERIF};font-size:${muted ? 15 : 16}px;line-height:1.65;color:${muted ? EMAIL_MUTED : EMAIL_BODY}">${inner}</p>`

  // Only made when we can state the gap as a fact.
  const expected = payload.expectedSubjects ?? null
  const count = payload.subjectCount ?? 0
  const subjectsLine =
    count > 0 && count < MAX_PROFILE_SUBJECTS
      ? para(
          `While you are there, add your other subjects — you have ${count === 1 ? 'one' : count} saved and can file up to ${MAX_PROFILE_SUBJECTS}, so the Vault is building ${count === 1 ? 'one desk' : `${count} desks`} instead of ${MAX_PROFILE_SUBJECTS}. <a href="${SUBJECTS_HREF}" style="color:#9f1239;font-weight:700;text-decoration:none">Add your subjects</a>.`,
          true
        )
      : para(
          `While you are there, <a href="${SUBJECTS_HREF}" style="color:#9f1239;font-weight:700;text-decoration:none">add your subjects</a> so the Vault builds a desk for each one.`,
          true
        )

  const bodyHtml = `
    ${para(greeting)}
    ${para(
      'Your subscription is live and you have not marked anything yet. That is the one step everything else hangs off — the weak topics, the question desk and the rewrite are all built out of what your own marking shows, so until you mark once the Vault can only guess.'
    )}
    ${para(
      'It takes about two minutes. Photograph a question you have answered, or paste it in, and you get it back marked against the real scheme — every mark you did not get, and the exact words that would have earned it.'
    )}
    ${subjectsLine}`

  const text = [
    greeting,
    '',
    'Your subscription is live and you have not marked anything yet. That is the one step everything else hangs off — the weak topics, the question desk and the rewrite are all built out of what your own marking shows, so until you mark once the Vault can only guess.',
    '',
    'It takes about two minutes. Photograph a question you have answered, or paste it in, and you get it back marked against the real scheme — every mark you did not get, and the exact words that would have earned it.',
    '',
    `Mark your first answer: ${SITE_URL}/mark`,
    '',
    count > 0 && count < MAX_PROFILE_SUBJECTS
      ? `While you are there, add your other subjects — you have ${count} saved and can file up to ${MAX_PROFILE_SUBJECTS}, so the Vault is building ${count === 1 ? 'one desk' : `${count} desks`} instead of ${MAX_PROFILE_SUBJECTS}: ${SUBJECTS_HREF}`
      : `While you are there, add your subjects so the Vault builds a desk for each one: ${SUBJECTS_HREF}`,
  ].join('\n')

  return {
    subject: 'Your Vault is still empty — here is the two-minute fix',
    text,
    html: renderBrandedEmailHtml({
      kicker: 'Getting started',
      preheader: 'One answer marked, and the Vault stops guessing.',
      bodyHtml,
      cta: { label: 'Mark your first answer', href: `${SITE_URL}/mark` },
    }),
  }
}

/** Loads the facts, then sends. Returns false when there is nothing to send to. */
export async function sendPaidActivationNudge(
  supabase: SupabaseClient,
  userId: string,
  opts: { to?: string; address?: string | null } = {}
): Promise<boolean> {
  const { data: authData } = await supabase.auth.admin.getUserById(userId)
  const email = opts.to ?? authData?.user?.email
  if (!email) return false

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('subjects, level')
    .eq('id', userId)
    .maybeSingle()

  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('tier, status')
    .eq('user_id', userId)
    .maybeSingle()

  const level = (profile?.level as string | null) ?? null
  const expected = level === 'IB Diploma' ? 6 : null

  const { subject, html, text } = buildPaidActivationEmail({
    to: email,
    address:
      opts.address ??
      (sub?.tier && sub.tier !== 'free'
        ? tierMarketingName(sub.tier as SubscriptionTier)
        : null),
    subjectCount: ((profile?.subjects as string[] | null) ?? []).length,
    expectedSubjects: expected,
    levelLabel: level,
  })

  return sendEmail({ to: email, subject, html, text })
}
