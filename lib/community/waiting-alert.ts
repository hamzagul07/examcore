import 'server-only'

import { sendEmail, adminNotifyAddress } from '@/lib/email/send'
import { SITE_NAME, SITE_URL } from '@/lib/site-config'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { communityFunnelReport } from '@/lib/community/funnel-report'

/**
 * Tell the team when a real person is waiting for a reply.
 *
 * The strongest predictor of somebody posting a second time is how quickly
 * their first post got answered, and a waiting list that only exists behind a
 * CLI command is one nobody reads on the day it matters. This is the same list,
 * pushed.
 *
 * Silent when nothing is waiting. A daily mail that usually says "all clear"
 * trains you to archive it unread, and then the one that matters goes with it.
 */
export async function sendWaitingAlert(): Promise<{ sent: boolean; waiting: number }> {
  if (!isCommunityEnabled()) return { sent: false, waiting: 0 }

  const report = await communityFunnelReport(7)
  const waiting = report.waiting.filter((w) => w.substantive)
  if (!waiting.length) return { sent: false, waiting: 0 }

  const oldest = waiting[waiting.length - 1]
  const today = waiting.filter((w) => w.ageDays === 0)

  const lines = [
    waiting.length === 1
      ? 'Someone posted and nobody has answered.'
      : `${waiting.length} people posted and nobody has answered.`,
    '',
  ]

  for (const w of waiting) {
    const age = w.ageDays === 0 ? 'today' : `${w.ageDays}d ago`
    lines.push(`${age.padStart(7)}  u/${w.author} — ${w.title}`)
    lines.push(`         ${SITE_URL}${w.href}`)
    lines.push('')
  }

  lines.push('─'.repeat(60), '')
  lines.push(
    'A first post that gets a reply is the one that turns into a second post.',
    'Replies from the team count; replies from the seeded accounts do not.',
    ''
  )
  lines.push(
    `Community reach, last 7 days: ${report.reach.communitySessions} of ${report.reach.siteSessions} sessions.`,
    `Real contributions: ${report.activity.posts} posts, ${report.activity.comments} comments, ${report.activity.contributors} people.`
  )

  await sendEmail({
    to: adminNotifyAddress(),
    subject:
      today.length > 0
        ? `[${SITE_NAME}] ${waiting.length} waiting in the Exam Room — ${today.length} from today`
        : `[${SITE_NAME}] ${waiting.length} waiting in the Exam Room — oldest ${oldest.ageDays}d`,
    preheader: `Oldest: ${oldest.title.slice(0, 80)}`,
    text: lines.join('\n'),
  })

  return { sent: true, waiting: waiting.length }
}
