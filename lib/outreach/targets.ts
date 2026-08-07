/**
 * Teacher outreach targets — identity, links, and funnel shape.
 *
 * Pure functions only, so the parts that decide what a link says and what the
 * funnel means can be tested without a database or a network.
 */

export const OUTREACH_STATUSES = [
  'queued',
  'sent',
  'bounced',
  'replied',
  'trialing',
  'signed_up',
  'linked',
  'declined',
] as const

export type OutreachStatus = (typeof OUTREACH_STATUSES)[number]

export type OutreachTarget = {
  school: string
  slug: string
  country?: string | null
  board?: string | null
  subject?: string | null
  contact_name?: string | null
  contact_email?: string | null
  contact_role?: string | null
  website?: string | null
  status: OutreachStatus
  sent_at?: string | null
  replied_at?: string | null
  linked_at?: string | null
}

/**
 * URL-safe identity for a school.
 *
 * Diacritics are folded rather than dropped so `Lycée Français` and
 * `Lycee Francais` cannot become two targets for one school, which would send
 * the same department two cold emails.
 */
export function schoolSlug(name: string): string {
  return name
    .normalize('NFD')
    // Combining marks left behind by NFD, written as escapes so the source
    // stays readable and cannot be mangled by an editor.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

/**
 * The `utm_source` for a school. The `school-` prefix is load-bearing:
 * `classify_channel()` in the database routes anything matching `school-%` to
 * the 'school' channel, so this is what makes outreach traffic countable.
 */
export function utmSourceFor(slug: string): string {
  return `school-${slug}`
}

/**
 * The link that goes in the email.
 *
 * `utm_medium=email` rather than `school` so the channel report can still tell
 * a cold email apart from a link a school published on its own site — both are
 * the campaign, but only the second one is a backlink.
 */
export function outreachLink(
  baseUrl: string,
  slug: string,
  opts: { path?: string; campaign?: string } = {}
): string {
  const url = new URL(opts.path ?? '/for-teachers', baseUrl)
  url.searchParams.set('utm_source', utmSourceFor(slug))
  url.searchParams.set('utm_medium', 'email')
  url.searchParams.set('utm_campaign', opts.campaign ?? 'teacher-outreach')
  return url.toString()
}

/**
 * The bare host of a school's website, for the school-domain allowlist.
 *
 * Education-TLD detection cannot see a school on a vanity domain
 * (harrowschool.org.uk), so the schools we are actively writing to teach the
 * classifier who they are. `www.` is stripped because the allowlist matches
 * subdomains itself. Returns null for anything unparseable rather than guessing
 * — a wrong entry here would credit someone else's traffic to the campaign.
 */
export function websiteHost(website: string | null | undefined): string | null {
  if (!website) return null
  const raw = website.trim()
  if (!raw) return null
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    const host = url.host.toLowerCase().replace(/^www\./, '')
    // A bare label ("localhost", a typo) is not a domain and must not be
    // allowlisted, since the matcher would then treat every subdomain of it as
    // a school.
    return host.includes('.') ? host : null
  } catch {
    return null
  }
}

export type OutreachFunnel = {
  total: number
  byStatus: Record<OutreachStatus, number>
  /** Everything that has actually left the outbox. */
  contacted: number
  /** Replies as a share of contacted, 0–1. */
  replyRate: number
  /** Schools whose own site now links here — the campaign's real output. */
  linked: number
  /** Sent, not bounced, no reply, and old enough to chase. */
  needsFollowUp: OutreachTarget[]
}

/** A week is long enough that silence means "missed it", not "thinking". */
const FOLLOW_UP_DAYS = 7

/** Statuses that mean the target has been contacted, whatever happened next. */
const CONTACTED: OutreachStatus[] = [
  'sent',
  'bounced',
  'replied',
  'trialing',
  'signed_up',
  'linked',
  'declined',
]

/** Statuses where a follow-up would be wrong, not merely unnecessary. */
const DO_NOT_CHASE: OutreachStatus[] = [
  'queued',
  'bounced',
  'replied',
  'trialing',
  'signed_up',
  'linked',
  'declined',
]

export function buildFunnel(
  targets: OutreachTarget[],
  now: Date = new Date()
): OutreachFunnel {
  const byStatus = Object.fromEntries(
    OUTREACH_STATUSES.map((s) => [s, 0])
  ) as Record<OutreachStatus, number>

  for (const t of targets) {
    if (byStatus[t.status] !== undefined) byStatus[t.status] += 1
  }

  const contacted = CONTACTED.reduce((sum, s) => sum + byStatus[s], 0)
  // A reply is a reply whatever came after it, so the later statuses count too.
  const replied =
    byStatus.replied + byStatus.trialing + byStatus.signed_up + byStatus.linked

  const cutoff = now.getTime() - FOLLOW_UP_DAYS * 24 * 60 * 60 * 1000
  const needsFollowUp = targets.filter((t) => {
    if (DO_NOT_CHASE.includes(t.status)) return false
    if (!t.sent_at) return false
    return new Date(t.sent_at).getTime() <= cutoff
  })

  return {
    total: targets.length,
    byStatus,
    contacted,
    replyRate: contacted ? replied / contacted : 0,
    linked: byStatus.linked,
    needsFollowUp,
  }
}
