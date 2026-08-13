import 'server-only'

import { createClient } from '@supabase/supabase-js'

import { sendMarkFailedEmail, sendMarkReadyEmail } from '@/lib/email/mark-ready'
import { unsubscribeUrl } from '@/lib/community/email-unsubscribe'

/**
 * Tell a student their mark finished after they left.
 *
 * The gate is deliberately narrow. This only fires when the client had already
 * disconnected — a student watching the progress bar gets the result on screen
 * and must never also get mail about it. Everything here is best-effort: a
 * notification failure cannot be allowed to fail a mark that already succeeded.
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type MarkReadyNotifyInput = {
  userId: string | null
  attemptId: string | null
  marksEarned: number | null
  totalMarks: number | null
  subjectLabel?: string | null
  paperRef?: string | null
  predictedMarks?: number | null
}

/**
 * Everything both notifications need: is there someone to write to, and do they
 * still want to hear from us. Returns null when the answer is no.
 */
async function resolveRecipient(
  userId: string
): Promise<{ to: string; name: string | null; unsubscribeHref: string } | null> {
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('full_name, email_mark_ready')
    .eq('id', userId)
    .maybeSingle()

  // Absent column or absent row both mean "never opted out" — the default is
  // on, and a missing profile must not silently swallow the notification.
  if (profile?.email_mark_ready === false) return null

  const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId)
  const to = authData?.user?.email
  if (!to) return null

  return {
    to,
    name: (profile?.full_name as string | null) ?? null,
    unsubscribeHref: unsubscribeUrl(userId, 'mark_ready'),
  }
}

export async function notifyMarkReady(
  input: MarkReadyNotifyInput
): Promise<boolean> {
  const { userId, attemptId } = input
  // Guests have no inbox we know of and no result page to send them to. They
  // are the population this cannot help, and the reason the wait screen still
  // tells signed-out students to stay put.
  if (!userId || !attemptId) return false

  const total = input.totalMarks ?? 0
  const earned = input.marksEarned ?? 0
  // A run can succeed without a usable denominator (MCQ key mismatch, an
  // unparsed total). "You scored 4/0" is worse than no email at all.
  if (!(total > 0)) return false

  try {
    const recipient = await resolveRecipient(userId)
    if (!recipient) return false

    sendMarkReadyEmail({
      to: recipient.to,
      recipientName: recipient.name,
      attemptId,
      marksEarned: earned,
      totalMarks: total,
      subjectLabel: input.subjectLabel ?? null,
      paperRef: input.paperRef ?? null,
      predictedMarks: input.predictedMarks ?? null,
      unsubscribeHref: recipient.unsubscribeHref,
    })
    return true
  } catch (err) {
    console.warn('[mark-ready] notify failed (mark itself succeeded)', err)
    return false
  }
}

/**
 * Tell a student the mark they walked away from did not finish.
 *
 * The wait screen promised an email. Staying silent on failure leaves them
 * waiting for something that is never coming — worse than never having offered
 * to email at all, and invisible to us because they never come back to see the
 * error.
 */
export async function notifyMarkFailed(input: {
  userId: string | null
  subjectLabel?: string | null
  paperRef?: string | null
}): Promise<boolean> {
  if (!input.userId) return false
  try {
    const recipient = await resolveRecipient(input.userId)
    if (!recipient) return false

    sendMarkFailedEmail({
      to: recipient.to,
      recipientName: recipient.name,
      subjectLabel: input.subjectLabel ?? null,
      paperRef: input.paperRef ?? null,
      unsubscribeHref: recipient.unsubscribeHref,
    })
    return true
  } catch (err) {
    console.warn('[mark-ready] failure notify failed', err)
    return false
  }
}
