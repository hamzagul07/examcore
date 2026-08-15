import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'
import { subscribeUrl, unsubscribeUrl } from '@/lib/community/email-unsubscribe'
import { sendBroadcastEmail } from '@/lib/email/broadcast'
import { thresholdStripHtml, thresholdStripText } from '@/lib/email/threshold-strip'
import { getOfficialBoundaries } from '@/lib/seo/grade-boundaries-data'
import { getGradeBoundaryCalculatorPages } from '@/lib/seo/programmatic-subjects'
import { getIbSubjects } from '@/lib/ib/catalog'
import { iaName, shortIbLabel, CORE_COMPONENTS } from '@/lib/community/ia-names'
import { isJune2026Session } from '@/lib/seo/results-day'
import { getSegment, SEGMENTS, type Recipient, type SegmentId } from '@/lib/campaigns/audience'
import { markBreakdownHtml, markBreakdownText } from '@/lib/email/mark-breakdown-strip'

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

/** Not a real user. Unsubscribe links in a preview must not touch a live row. */
const PREVIEW_USER_ID = '00000000-0000-4000-8000-000000000000'

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

/**
 * Send exactly one real copy of a campaign to one address.
 *
 * For reading the thing as it will actually arrive — rendered, with the CTA
 * live — before deciding whether hundreds of students should get it. It never
 * touches the audience, never marks the campaign as started, and records
 * nothing, so previewing twice is free and previewing cannot be mistaken for a
 * send.
 */
export async function previewCampaign(opts: {
  slug: string
  to: string
}): Promise<{ slug: string; to: string; delivered: boolean }> {
  const admin = createServiceClient()
  const { data: campaign } = await admin
    .from('campaigns')
    .select('id, slug, subject, preheader, body, audience, cta_label, cta_href, status')
    .eq('slug', opts.slug)
    .maybeSingle()

  if (!campaign) throw new Error(`no campaign with slug "${opts.slug}"`)
  const c = campaign as CampaignRow

  const kind = SEGMENTS[c.audience as SegmentId]?.unsubscribeKind ?? 'updates'
  // A placeholder recipient: the preview must render the same code path the
  // real send uses, tokens and all, or it is not a preview of anything.
  const recipient: Recipient = {
    userId: PREVIEW_USER_ID,
    email: opts.to,
    name: 'Preview',
    // Stand-ins so a preview shows the shape a real recipient would see.
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
  }

  const delivered = await deliver(c, recipient, kind)
  return { slug: c.slug, to: opts.to, delivered }
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
    // Their actual subjects. A campaign that can name them is a letter; one
    // that cannot is a broadcast, and reads like one.
    .replaceAll('{{subjects}}', formatSubjects(r.subjects))
    .replaceAll('{{focus_headline}}', focusHeadline(focusFor(r)))
}

/**
 * Where the IB call-to-action points.
 *
 * Their own subject's thread, not the feed. The first version of this campaign
 * shipped pointing at /community, which is the mixed firehose — the exact dead
 * end the thread route exists to remove, and it also bypasses the click log, so
 * the campaign could not be measured either. cta_href runs through the same
 * substitution as the body, so there was never a reason for it to be generic.
 */
function ibThreadHref(focus: { slug: string } | null): string {
  const base = focus ? `/community/thread/${focus.slug}` : '/community'
  return `https://markscheme.app${base}?utm_source=campaign&utm_medium=email&utm_campaign=ib-ia-2026`
}

/** IB headline, resolved before send because the lookup is async. */
function ibHeadline(focus: { label: string; ia: string } | null): string {
  if (!focus) return 'Your IA question: get it right before it costs you months'
  // Em dash, not a colon: several official IB names contain one already.
  return `${focus.label} — is your ${focus.ia} question workable?`
}

/**
 * The subject this recipient's email is built around.
 *
 * Their first listed subject that we hold June 2026 tables for, matched on the
 * label the boundary pages already use — "Physics", "Further Mathematics" — which
 * is exactly what onboarding stores. The biggest paper is chosen because it is
 * the one carrying the most marks and so the one they care most about.
 *
 * Null when nothing matches, which happens for an IGCSE-only list: those tables
 * do not publish until 18 August, and quoting an A-Level figure at somebody who
 * did not sit A-Levels is worse than not personalising at all.
 */
function focusFor(r: Recipient): { name: string; component: MarkComponentLike } | null {
  // Every code sharing a label, not just one. "Physics" is 9702 at A-Level and
  // also 0625 and 5054 at IGCSE and O-Level, so a label→code map keeps whichever
  // came last and silently answers with a syllabus that has no June 2026 table.
  // That quietly cost the four biggest subjects — Maths, Chemistry, Physics and
  // Biology — their personalisation, which is exactly the half that matters.
  const byLabel = new Map<string, string[]>()
  for (const s of getGradeBoundaryCalculatorPages()) {
    const key = s.label.toLowerCase()
    byLabel.set(key, [...(byLabel.get(key) ?? []), s.code])
  }

  for (const subject of r.subjects) {
    for (const code of byLabel.get(subject.trim().toLowerCase()) ?? []) {
      const session = getOfficialBoundaries(code)?.sessions.find((x) => isJune2026Session(x.session))
      const usable = (session?.components ?? []).filter(
        (c) => Number.isFinite(c.max) && Number.isFinite(c.thresholds?.A)
      )
      if (!usable.length) continue
      const biggest = [...usable].sort(
        (a, b) => b.max - a.max || a.component.localeCompare(b.component)
      )[0]
      return { name: subject.trim(), component: { ...biggest, code } }
    }
  }
  return null
}

type MarkComponentLike = {
  code: string
  component: string
  paper: string
  max: number
  thresholds: Record<string, number>
}

/**
 * The IB subject this recipient's email is built around.
 *
 * Their first subject that has a live IA thread — matched against real threads
 * rather than the catalog, so the email never names a room we did not open.
 * Core components are skipped: the EE is a research essay and TOK an essay on a
 * prescribed title, and calling either an IA is the kind of error an IB student
 * spots in the subject line.
 */
async function ibFocusFor(r: Recipient): Promise<{ slug: string; label: string; ia: string } | null> {
  const admin = createServiceClient()
  const { data } = await admin
    .from('community_posts')
    .select('subject_code')
    .eq('status', 'published')
    .eq('board', 'ib')
    .eq('flair', 'IA')
  const live = new Set((data ?? []).map((t) => t.subject_code as string))
  if (!live.size) return null

  const catalog = new Map(getIbSubjects().map((s) => [s.slug, s]))

  for (const raw of r.subjects) {
    const slug = raw.replace(/^ib-/, '')
    if (CORE_COMPONENTS.has(slug) || !live.has(slug)) continue
    const subject = catalog.get(slug)
    if (!subject) continue
    return { slug, label: shortIbLabel(subject.name, subject.level), ia: iaName(slug) }
  }
  return null
}

/**
 * The whole personalised clause as one token.
 *
 * A single token rather than several, so the sentence is always coherent: with
 * separate {{subject}} and {{mark}} tokens a recipient we cannot place ends up
 * reading "In your subjects, an A was — out of —".
 */
function focusHeadline(focus: ReturnType<typeof focusFor>): string {
  if (!focus) return 'Your grades are out. How close were you?'
  const { thresholds, max } = focus.component
  return `In ${focus.name}, an A was ${thresholds.A} out of ${max}. Where were you?`
}

/**
 * The visual a campaign draws, if it draws one.
 *
 * Keyed by slug and built from the verified threshold files, so the picture in
 * the email cannot drift from the tables the site publishes. A campaign with no
 * entry here simply has no {{visual}} to fill and the marker is dropped.
 */
function campaignVisual(
  slug: string,
  focus: ReturnType<typeof focusFor>
): { html: string; text: string } | undefined {
  // Both August campaigns claim marking comes back broken down point by point
  // rather than as an impression. Drawing one question makes that checkable in
  // two seconds instead of asking for the sentence to be believed. Invented
  // wording, not a real student's script and not a scheme quoted verbatim — the
  // shape is the claim, and the shape is what is shown.
  if (
    slug === 'never-marked-waiting-is-fixed-2026-08' ||
    slug === 'marking-does-not-need-you-2026-08'
  ) {
    const opts = {
      caption: 'Economics 9708 · Paper 2 · a 4-mark question',
      question: 'Explain two reasons why demand for a normal good may rise. [4]',
      points: [
        { code: 'B1', detail: 'Identifies a rise in real income', awarded: true },
        { code: 'B1', detail: 'Explains the link to a normal good', awarded: true },
        { code: 'B1', detail: 'Identifies a second valid reason', awarded: true },
        { code: 'B1', detail: 'No explanation of the second reason given', awarded: false },
      ],
    }
    return { html: markBreakdownHtml(opts), text: markBreakdownText(opts) }
  }

  if (slug !== 'results-2026-post-your-marks') return undefined

  // Their own paper where we can place them; Physics as the stand-in otherwise,
  // and the caption names it either way so nothing is implied about their marks.
  const component =
    focus?.component ??
    (() => {
      const session = getOfficialBoundaries('9702')?.sessions.find((x) => isJune2026Session(x.session))
      const c = session?.components.find((x) => x.component === '41')
      return c ? { ...c, code: '9702' } : null
    })()
  if (!component) return undefined

  const name = focus?.name ?? 'Physics'
  const opts = {
    caption: `${component.code} ${name} · ${component.paper} · June 2026`,
    max: component.max,
    bands: (['A', 'B', 'C', 'D', 'E'] as const)
      .filter((g) => Number.isFinite(component.thresholds[g]))
      .map((g) => ({ grade: g, at: component.thresholds[g] })),
  }
  return { html: thresholdStripHtml(opts), text: thresholdStripText(opts) }
}

/** "Physics, Chemistry and Maths" — an English list, not a CSV dump. */
function formatSubjects(subjects: string[]): string {
  const clean = subjects
    .map((s) => s.replace(/^ib-/, '').replace(/-/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 4)
  if (!clean.length) return 'your subjects'
  if (clean.length === 1) return clean[0]
  return `${clean.slice(0, -1).join(', ')} and ${clean[clean.length - 1]}`
}

async function deliver(
  c: CampaignRow,
  r: Recipient,
  kind: 'updates' | 'activation'
): Promise<boolean> {
  // Resolved here rather than in fillPlaceholders because it needs a query, and
  // a token that silently costs a round trip per substitution is a trap.
  const ibFocus = c.audience === 'ib_ia_season' ? await ibFocusFor(r) : null
  const withIb = (text: string) =>
    text
      .replaceAll('{{ib_headline}}', ibHeadline(ibFocus))
      .replaceAll('{{ib_thread}}', ibThreadHref(ibFocus))
  const cta =
    c.cta_label && c.cta_href
      ? { label: c.cta_label, href: withIb(fillPlaceholders(c.cta_href, r, kind)) }
      : null
  try {
    return await sendBroadcastEmail({
      visual: campaignVisual(c.slug, focusFor(r)),
      to: r.email,
      recipientName: r.name,
      subject: withIb(fillPlaceholders(c.subject, r, kind)),
      preheader: c.preheader,
      body: withIb(fillPlaceholders(c.body, r, kind)),
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
