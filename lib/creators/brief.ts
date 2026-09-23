/**
 * The weekly creator brief (docs/CREATORS_PROGRAM.md, "the content engine").
 *
 * A creator who gets a code and then hears nothing stops posting; that is the
 * documented failure mode of ambassador programs. Every Monday a creator gets
 * their numbers, one thing only a marking product can tell them, and three
 * formats to film. Sends only when CREATOR_BRIEF_SEND=true; dry-run otherwise.
 */
import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'
import { unsubscribeUrl } from '@/lib/community/email-unsubscribe'
import { sendCreatorBriefEmail, type CreatorBriefData } from '@/lib/email/creator-brief'
import { headlineGap } from '@/lib/teacher/cohort-gaps'
import { SITE_URL } from '@/lib/site-config'
import {
  creatorMarkPath,
  creatorSpacePath,
  GAP_REPORT_MIN_SCRIPTS,
  nextMilestone,
} from '@/lib/creators/codes'
import {
  getAudienceGapReport,
  getCreatorByUserId,
  getCreatorStats,
  listCreatorDailyMarked,
  type CreatorPublic,
} from '@/lib/creators/service'

/**
 * Formats a study-tips creator can film in twenty minutes. Three rotate each
 * ISO week, so two briefs in a row never repeat a hook.
 */
export const CREATOR_HOOKS: readonly string[] = [
  'I let an AI examiner mark my answer — screen-record the ink and react to every mark it takes off.',
  'The one word examiners look for in a 6-marker. Use it in an answer, get marked with the code, show whether it landed.',
  'POV: you find out which mark you keep dropping. Mark two answers back to back and show the same mark going both times.',
  'Marking my old mock answer against the real mark scheme. Rate my chances before the score appears.',
  'Three things I would tell myself before this exam — film number two as the mark everyone loses, with the ink to prove it.',
  'Guess the mark. Show the answer, let people comment a score, then reveal the examiner ink.',
  'Study with me, but we get marked at the end. Twenty minutes of work, ninety seconds of marking.',
  'The mark-scheme phrase that gets the mark every time — and the one that sounds right but never does.',
  'Got marked live. Read out the exact line that lost the mark and rewrite it on camera.',
  'Write your answer in the comments; I will get the top one marked with my code and post the ink.',
  'Grade my handwriting: photo of the page, marked in ninety seconds, no account. Do it in one take.',
  'Follower challenge: a hundred of you get one answer marked with my code by Sunday. Post the counter from your space.',
]

function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7)
}

/** Three hooks for the week that contains `date`; consecutive weeks never overlap. */
export function hooksForWeek(date = new Date()): string[] {
  const n = CREATOR_HOOKS.length
  const start = (isoWeek(date) * 3) % n
  return [0, 1, 2].map((i) => CREATOR_HOOKS[(start + i) % n])
}

export async function computeCreatorBrief(
  creator: CreatorPublic,
  now = new Date()
): Promise<CreatorBriefData> {
  const [stats, week, report] = await Promise.all([
    getCreatorStats(creator),
    listCreatorDailyMarked(creator.code, 7),
    getAudienceGapReport(creator.code),
  ])
  const headline = report.scripts >= GAP_REPORT_MIN_SCRIPTS ? headlineGap(report) : null
  const next = nextMilestone(stats.marked)
  return {
    handle: creator.handle,
    code: creator.code,
    markedThisWeek: week.reduce((sum, d) => sum + d.count, 0),
    markedTotal: stats.marked,
    joinedTotal: stats.joined,
    giftLeft: Math.max(0, stats.giftPoolMonthly - stats.giftClaimedThisMonth),
    giftPool: stats.giftPoolMonthly,
    nextMilestone: next ? { label: next.label, remaining: next.remaining } : null,
    gap: headline
      ? { label: headline.label, earnedPct: headline.earnedPct, scripts: report.scripts }
      : null,
    hooks: hooksForWeek(now),
    spaceUrl: `${SITE_URL}${creatorSpacePath(creator.handle)}`,
    studioUrl: `${SITE_URL}/creator`,
    markUrl: `${SITE_URL}${creatorMarkPath(creator.code)}`,
  }
}

function emailsEnabled(): boolean {
  return process.env.CREATOR_BRIEF_SEND === 'true'
}

/** Six days: a Monday cron that retries on Tuesday must not mail twice. */
const DEDUP_MS = 6 * 24 * 60 * 60 * 1000

export async function sendCreatorBriefBatch(): Promise<{
  sent: number
  considered: number
  skipped: number
  dryRun: boolean
}> {
  const admin = createServiceClient()
  const nowIso = new Date().toISOString()
  const dedupCutoff = new Date(Date.now() - DEDUP_MS).toISOString()
  const dryRun = !emailsEnabled()

  const { data: rows } = await admin
    .from('creators')
    .select('user_id, brief_last_sent_at')
    .eq('status', 'active')

  let sent = 0
  let considered = 0
  let skipped = 0

  for (const row of rows ?? []) {
    const userId = row.user_id as string
    const { data: profile } = await admin
      .from('user_profiles')
      .select('email_creator_brief')
      .eq('id', userId)
      .maybeSingle()
    if (profile?.email_creator_brief === false) {
      skipped++
      continue
    }
    const lastSent = row.brief_last_sent_at as string | null
    if (lastSent && lastSent > dedupCutoff) {
      skipped++
      continue
    }

    const creator = await getCreatorByUserId(userId)
    if (!creator || creator.status !== 'active') {
      skipped++
      continue
    }

    considered++
    const data = await computeCreatorBrief(creator)

    if (dryRun) {
      console.log('[creator-brief] dry-run — would send to', creator.handle, JSON.stringify(data))
      continue
    }

    const { data: authData } = await admin.auth.admin.getUserById(userId)
    const email = authData?.user?.email
    if (!email) {
      skipped++
      continue
    }
    sendCreatorBriefEmail({
      to: email,
      recipientName: creator.displayName,
      data,
      unsubscribeHref: unsubscribeUrl(userId, 'creator'),
    })
    sent++
    await admin.from('creators').update({ brief_last_sent_at: nowIso }).eq('user_id', userId)
  }

  return { sent, considered, skipped, dryRun }
}
