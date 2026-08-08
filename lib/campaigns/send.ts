import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'
import { subscribeUrl, unsubscribeUrl } from '@/lib/community/email-unsubscribe'
import { sendBroadcastEmail } from '@/lib/email/broadcast'
import { getSegment, type Recipient } from '@/lib/campaigns/audience'

/**
 * Campaign sender.
 *
 * Resumable by construction: the recipient list is the segment minus everyone
 * already in campaign_sends for this campaign. Crash halfway through, re-run,
 * and it picks up exactly where it stopped. That is also why the send is
 * recorded per recipient rather than once at the end — a batch that dies at
 * recipient 40 must not re-mail the first 39.
 *
 * The record is written AFTER a confirmed send. The failure mode that matters
 * is mailing someone twice, not missing a row: an unrecorded success gets
 * retried on the next run, which is recoverable; a recorded failure is not.
 */

export type CampaignRunResult = {
  slug: string
  audience: string
  audience_size: number
  already_sent: number
  attempted: number
  sent: number
  failed: number
  remaining: number
  dry_run: boolean
}

export type CampaignRow = {
  id: string
  slug: string
  subject: string
  preheader: string | null
  body: string
  audience: string
  cta_label: string | null
  cta_href: string | null
  status: string
}

export async function runCampaign(opts: {
  slug: string
  /** Nothing sends unless this is explicitly true. */
  live: boolean
  /** Ceiling for this run; the rest carry over to the next. */
  limit: number
}): Promise<CampaignRunResult> {
  const admin = createServiceClient()

  const { data: campaign, error: cErr } = await admin
    .from('campaigns')
    .select('id, slug, subject, preheader, body, audience, cta_label, cta_href, status')
    .eq('slug', opts.slug)
    .maybeSingle()

  if (cErr) throw new Error(`campaign lookup failed: ${cErr.message}`)
  if (!campaign) throw new Error(`no campaign with slug "${opts.slug}"`)

  const c = campaign as CampaignRow
  if (c.status === 'cancelled') throw new Error(`campaign "${c.slug}" is cancelled`)

  const segment = getSegment(c.audience)
  if (!segment) throw new Error(`unknown audience "${c.audience}"`)

  const audience = await segment.resolve()

  const { data: sentRows, error: sErr } = await admin
    .from('campaign_sends')
    .select('user_id')
    .eq('campaign_id', c.id)
  if (sErr) throw new Error(`sent-list query failed: ${sErr.message}`)
  const alreadySent = new Set((sentRows ?? []).map((r) => r.user_id as string))

  const pending = audience.filter((r) => !alreadySent.has(r.userId))
  const batch = pending.slice(0, opts.limit)

  const result: CampaignRunResult = {
    slug: c.slug,
    audience: c.audience,
    audience_size: audience.length,
    already_sent: alreadySent.size,
    attempted: batch.length,
    sent: 0,
    failed: 0,
    remaining: pending.length - batch.length,
    dry_run: !opts.live,
  }

  if (!opts.live || batch.length === 0) return result

  await admin
    .from('campaigns')
    .update({ status: 'sending', started_at: new Date().toISOString() })
    .eq('id', c.id)

  for (const r of batch) {
    const ok = await deliver(c, r, segment.unsubscribeKind)
    if (!ok) {
      result.failed++
      continue
    }
    const { error } = await admin
      .from('campaign_sends')
      .insert({ campaign_id: c.id, user_id: r.userId })
    // A conflict means another run already recorded this recipient — not an
    // error, and not a reason to count the send twice.
    if (error && !`${error.message}`.includes('duplicate')) {
      console.error('[campaign] send record failed:', r.userId, error.message)
    }
    result.sent++
  }

  const done = result.remaining === 0 && result.failed === 0
  await admin
    .from('campaigns')
    .update({
      status: done ? 'sent' : 'sending',
      ...(done ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq('id', c.id)

  return result
}

/**
 * Per-recipient placeholders.
 *
 * A campaign body is one static string, but the consent links are signed per
 * user — so the re-permission ask cannot be written without this. Substitution
 * happens at delivery, after the body has left the database and before it is
 * escaped, so a campaign can carry a real opt-in link without storing 152
 * variants of itself.
 */
function fillPlaceholders(text: string, r: Recipient, kind: 'updates' | 'activation'): string {
  return text
    .replaceAll('{{subscribe_url}}', subscribeUrl(r.userId, kind))
    .replaceAll('{{unsubscribe_url}}', unsubscribeUrl(r.userId, kind))
    .replaceAll('{{first_name}}', r.name?.trim().split(/\s+/)[0] ?? 'there')
}

async function deliver(
  c: CampaignRow,
  r: Recipient,
  kind: 'updates' | 'activation'
): Promise<boolean> {
  const cta =
    c.cta_label && c.cta_href
      ? { label: c.cta_label, href: fillPlaceholders(c.cta_href, r, kind) }
      : null
  try {
    return await sendBroadcastEmail({
      to: r.email,
      recipientName: r.name,
      subject: c.subject,
      preheader: c.preheader,
      body: fillPlaceholders(c.body, r, kind),
      cta,
      unsubscribeHref: unsubscribeUrl(r.userId, kind),
      unsubscribeLabel:
        kind === 'updates' ? 'Unsubscribe from product updates' : 'Turn off getting-started emails',
    })
  } catch (err) {
    console.error('[campaign] send threw:', r.userId, err)
    return false
  }
}
