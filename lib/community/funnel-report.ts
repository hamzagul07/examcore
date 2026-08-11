import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'
import { THREAD_CLICK_PREFIX } from '@/lib/community/thread-clicks'

/** Seeded/official accounts, so "real activity" means what it says. */
const BOT_PREFIX = 'a10000'

export type SourceRow = {
  source: string
  clicks: number
  toThread: number
  toFallback: number
}

export type FunnelReport = {
  days: number
  clicks: { total: number; toThread: number; bySource: SourceRow[]; bySubject: SourceRow[] }
  reach: { communityViews: number; communitySessions: number; siteSessions: number }
  activity: { posts: number; comments: number; contributors: number }
  accounts: { namedTotal: number; profiles: number; digestOn: number }
}

function isBot(id: string | null | undefined): boolean {
  return !!id && id.startsWith(BOT_PREFIX)
}

/** PostgREST caps a select at 1000 rows and says nothing about it — a week of
 *  page_events is several times that, so the totals came out silently wrong
 *  until this paged through them. */
async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null }>
): Promise<T[]> {
  const SIZE = 1000
  const out: T[] = []
  for (let from = 0; ; from += SIZE) {
    const { data } = await page(from, from + SIZE - 1)
    const batch = data ?? []
    out.push(...batch)
    if (batch.length < SIZE) return out
  }
}

/**
 * How the results-week funnel is actually performing.
 *
 * Answers the only question the work raised: did wiring the CTA onto the
 * boundary pages move anybody into the Exam Room, and did any of them talk.
 * Clicks come from the synthetic /__cta rows the redirect writes, because
 * page_events drops query strings and the utm_source would otherwise vanish.
 */
export async function communityFunnelReport(days: number): Promise<FunnelReport> {
  const admin = createServiceClient()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const [clicks, views, posts, comments, profiles] = await Promise.all([
    fetchAll<{ path: string; referrer: string | null }>((from, to) =>
      admin
        .from('page_events')
        .select('path, referrer')
        .like('path', `${THREAD_CLICK_PREFIX}%`)
        .gte('created_at', since)
        .range(from, to)
    ),
    fetchAll<{ path: string; session_id: string | null }>((from, to) =>
      admin.from('page_events').select('path, session_id').gte('created_at', since).range(from, to)
    ),
    fetchAll<{ author_id: string }>((from, to) =>
      admin
        .from('community_posts')
        .select('author_id')
        .eq('status', 'published')
        .gte('created_at', since)
        .range(from, to)
    ),
    fetchAll<{ author_id: string }>((from, to) =>
      admin
        .from('community_comments')
        .select('author_id')
        .eq('status', 'published')
        .gte('created_at', since)
        .range(from, to)
    ),
    fetchAll<{ username: string | null; email_community_digest: boolean }>((from, to) =>
      admin.from('user_profiles').select('username, email_community_digest').range(from, to)
    ),
  ])

  const bySource = new Map<string, SourceRow>()
  const bySubject = new Map<string, SourceRow>()
  let toThread = 0

  for (const row of clicks) {
    // /__cta/results-thread/<source>/<subject>
    const parts = String(row.path).slice(THREAD_CLICK_PREFIX.length + 1).split('/')
    const source = parts[0] || 'unknown'
    const subject = parts[1] || 'unknown'
    const landed = row.referrer === 'thread'
    if (landed) toThread++

    for (const [map, key] of [
      [bySource, source],
      [bySubject, subject],
    ] as const) {
      const entry = map.get(key) ?? { source: key, clicks: 0, toThread: 0, toFallback: 0 }
      entry.clicks++
      if (landed) entry.toThread++
      else entry.toFallback++
      map.set(key, entry)
    }
  }

  const communityViews = views.filter((v) => String(v.path).startsWith('/community')).length
  const communitySessions = new Set(
    views.filter((v) => String(v.path).startsWith('/community') && v.session_id).map((v) => v.session_id)
  ).size
  const siteSessions = new Set(views.filter((v) => v.session_id).map((v) => v.session_id)).size

  const humanPosts = posts.filter((p) => !isBot(p.author_id))
  const humanComments = comments.filter((c) => !isBot(c.author_id))
  const contributors = new Set([
    ...humanPosts.map((p) => p.author_id),
    ...humanComments.map((c) => c.author_id),
  ]).size

  const rank = (m: Map<string, SourceRow>) => [...m.values()].sort((a, b) => b.clicks - a.clicks)

  return {
    days,
    clicks: {
      total: clicks.length,
      toThread,
      bySource: rank(bySource),
      bySubject: rank(bySubject),
    },
    reach: { communityViews, communitySessions, siteSessions },
    activity: { posts: humanPosts.length, comments: humanComments.length, contributors },
    accounts: {
      namedTotal: profiles.filter((p) => p.username).length,
      profiles: profiles.length,
      digestOn: profiles.filter((p) => p.email_community_digest).length,
    },
  }
}

function bar(n: number, max: number, width = 22): string {
  if (max <= 0) return ''
  return '█'.repeat(Math.max(1, Math.round((n / max) * width)))
}

export function formatFunnelReport(r: FunnelReport): string {
  const out: string[] = []
  const pct = (n: number, d: number) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : '—')

  out.push(`\nExam Room funnel — last ${r.days} day${r.days === 1 ? '' : 's'}`)
  out.push('─'.repeat(58))

  out.push(`\nCTA clicks through to a thread: ${r.clicks.total}`)
  if (r.clicks.total) {
    out.push(`  reached a real thread: ${r.clicks.toThread} (${pct(r.clicks.toThread, r.clicks.total)})`)
    out.push(`  fell back to a room:   ${r.clicks.total - r.clicks.toThread}`)

    const max = r.clicks.bySource[0]?.clicks ?? 0
    out.push('\n  By source page')
    for (const s of r.clicks.bySource) {
      out.push(`    ${s.source.padEnd(26)} ${String(s.clicks).padStart(4)}  ${bar(s.clicks, max)}`)
    }

    const maxSubj = r.clicks.bySubject[0]?.clicks ?? 0
    out.push('\n  By subject')
    for (const s of r.clicks.bySubject.slice(0, 10)) {
      const note = s.toFallback ? `  (${s.toFallback} fell back — no live thread)` : ''
      out.push(`    ${s.source.padEnd(26)} ${String(s.clicks).padStart(4)}  ${bar(s.clicks, maxSubj)}${note}`)
    }
  } else {
    out.push('  (no clicks recorded yet — the redirect logs these from the moment it ships)')
  }

  out.push('\nReach')
  out.push(`  community page views:   ${r.reach.communityViews}`)
  out.push(`  community sessions:     ${r.reach.communitySessions}`)
  out.push(`  site sessions:          ${r.reach.siteSessions}`)
  out.push(`  share reaching community: ${pct(r.reach.communitySessions, r.reach.siteSessions)}`)

  out.push('\nReal activity (seeded accounts excluded)')
  out.push(`  posts:        ${r.activity.posts}`)
  out.push(`  comments:     ${r.activity.comments}`)
  out.push(`  contributors: ${r.activity.contributors}`)

  out.push('\nAccounts')
  out.push(`  with a public name: ${r.accounts.namedTotal} / ${r.accounts.profiles}`)
  out.push(`  digest opted in:    ${r.accounts.digestOn}`)

  out.push('')
  return out.join('\n')
}
