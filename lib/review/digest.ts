import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'
import { getSyllabusTopicByCode } from '@/lib/syllabi'
import { getSubjectByCode } from '@/lib/profile-options'
import { unsubscribeUrl } from '@/lib/community/email-unsubscribe'
import { sendReviewDigestEmail, type ReviewDigestTopic } from '@/lib/email/review'

// Don't re-digest a user within 24h (the weekly cron plus this guard means at
// most one nudge per run).
const DEDUP_MS = 24 * 60 * 60 * 1000

/** Emails go out only when explicitly enabled — ships OFF. In-app notifications
 * are always safe to create. */
function emailsEnabled(): boolean {
  return process.env.REVIEW_DIGEST_SEND === 'true'
}

/**
 * Weekly re-engagement: for each opted-in user with spaced-review topics that
 * are due, create an in-app "topics due" notification and (if enabled) send a
 * digest email. Reuses the community-digest batch pattern; opt-out is
 * `email_review_digest` + the one-click `review` unsubscribe token.
 */
export async function sendReviewDigestBatch(): Promise<{
  sent: number
  notified: number
  skipped: number
}> {
  const admin = createServiceClient()
  const nowIso = new Date().toISOString()
  const cutoff = new Date(Date.now() - DEDUP_MS).toISOString()

  const { data: subscribers } = await admin
    .from('user_profiles')
    .select('id, full_name, review_digest_last_sent_at')
    .eq('email_review_digest', true)

  let sent = 0
  let notified = 0
  let skipped = 0

  for (const row of subscribers ?? []) {
    const lastSent = row.review_digest_last_sent_at as string | null
    if (lastSent && lastSent > cutoff) {
      skipped++
      continue
    }

    const { data: due } = await admin
      .from('review_schedule')
      .select('subject_code, topic_code')
      .eq('user_id', row.id as string)
      .lte('due_at', nowIso)
      .limit(8)

    if (!due?.length) {
      skipped++
      continue
    }

    const topics: ReviewDigestTopic[] = due.map((d) => {
      const subject = d.subject_code as string
      const code = d.topic_code as string
      return {
        name: getSyllabusTopicByCode(subject, code)?.name ?? code,
        subjectLabel: getSubjectByCode(subject)?.label ?? subject,
      }
    })

    // In-app notification — always (no external send).
    await admin.from('notifications').insert({
      user_id: row.id,
      type: 'review-due',
      title: `${topics.length} ${topics.length === 1 ? 'topic' : 'topics'} due for review`,
      href: '/dashboard/review',
    })
    notified++

    // Email — only when explicitly enabled.
    if (emailsEnabled()) {
      const { data: authData } = await admin.auth.admin.getUserById(row.id as string)
      const email = authData?.user?.email
      if (email) {
        sendReviewDigestEmail({
          to: email,
          recipientName: row.full_name as string | null,
          topics,
          unsubscribeHref: unsubscribeUrl(row.id as string, 'review'),
        })
        sent++
      }
    }

    await admin
      .from('user_profiles')
      .update({ review_digest_last_sent_at: nowIso })
      .eq('id', row.id as string)
  }

  return { sent, notified, skipped }
}
