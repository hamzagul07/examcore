import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'
import { THREAD_CLICK_PREFIX } from '@/lib/community/thread-clicks'
import { isOfficialUsername } from '@/lib/community/official'

/** Seeded/official accounts, so "real activity" means what it says. */
const BOT_PREFIX = 'a10000'

export type SourceRow = {
  source: string
  clicks: number
  toThread: number
  toFallback: number
}

export type WaitingItem = {
  kind: 'post' | 'question'
  id: string
  title: string
  author: string
  ageDays: number
  /** False for one-liners with nothing to answer ("anyone?", "yo?"). */
  substantive: boolean
}

export type FunnelReport = {
  days: number
  clicks: { total: number; toThread: number; bySource: SourceRow[]; bySubject: SourceRow[] }
  reach: { communityViews: number; communitySessions: number; siteSessions: number }
  activity: { posts: number; comments: number; contributors: number }
  accounts: { namedTotal: number; profiles: number; digestOn: number }
  /** Real students whose post or question nobody has answered. */
  waiting: WaitingItem[]
}

function isBot(id: string | null | undefined): boolean {
  return !!id && id.startsWith(BOT_PREFIX)
}

/**
 * Read every row, not the first thousand.
 *
 * PostgREST caps a select at 1000 rows and says nothing about it — a week of
 * page_events is several times that, so the totals came out silently wrong
 * until this paged through them. Errors throw rather than truncate: a report
 * that quietly under-counts is worse than one that fails, because the numbers
 * it invents look plausible.
 */
async function fetchAll<T>(
  label: string,
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const SIZE = 1000
  const out: T[] = []
  for (let from = 0; ; from += SIZE) {
    const { data, error } = await page(from, from + SIZE - 1)
    if (error) throw new Error(`funnel report: reading ${label} failed — ${error.message}`)
    const batch = data ?? []
    out.push(...batch)
    if (batch.length < SIZE) return out
  }
}

type PostRow = {
  id: string
  author_id: string
  title: string
  created_at: string
  body_md: string | null
  attachments: unknown[] | null
}
type QuestionRow = { id: string; author_id: string; title: string; created_at: string; body_md: string | null }
type CommentRow = { post_id: string; author_id: string; created_at: string }
type AnswerRow = { question_id: string; author_id: string; created_at: string }
type ProfileRow = { id: string; username: string | null; email_community_digest: boolean }

/**
 * How the results-week funnel is actually performing.
 *
 * Answers the only question the work raised: did wiring the CTA onto the
 * boundary pages move anybody into the Exam Room, and did any of them talk.
 * Clicks come from the synthetic /__cta rows the redirect writes, because
 * page_events drops query strings and the utm_source would otherwise vanish.
 *
 * Posts, comments and profiles are read once in full and windowed in memory.
 * The "who is waiting" list deliberately ignores the window — a student
 * ignored in July is still ignored — so fetching each table twice bought
 * nothing but round trips.
 */
export async function communityFunnelReport(days: number): Promise<FunnelReport> {
  const admin = createServiceClient()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const [clicks, views, allPosts, allComments, allQuestions, allAnswers, profiles] = await Promise.all([
    fetchAll<{ path: string; referrer: string | null }>('cta clicks', (from, to) =>
      admin
        .from('page_events')
        .select('path, referrer')
        .like('path', `${THREAD_CLICK_PREFIX}%`)
        .gte('created_at', since)
        .range(from, to)
    ),
    fetchAll<{ path: string; session_id: string | null }>('page views', (from, to) =>
      admin.from('page_events').select('path, session_id').gte('created_at', since).range(from, to)
    ),
    fetchAll<PostRow>('posts', (from, to) =>
      admin
        .from('community_posts')
        .select('id, author_id, title, created_at, body_md, attachments')
        .eq('status', 'published')
        .range(from, to)
    ),
    fetchAll<CommentRow>('comments', (from, to) =>
      admin
        .from('community_comments')
        .select('post_id, author_id, created_at')
        .eq('status', 'published')
        .range(from, to)
    ),
    fetchAll<QuestionRow>('questions', (from, to) =>
      admin
        .from('community_questions')
        .select('id, author_id, title, created_at, body_md')
        .eq('status', 'published')
        .range(from, to)
    ),
    fetchAll<AnswerRow>('answers', (from, to) =>
      admin
        .from('community_answers')
        .select('question_id, author_id, created_at')
        .eq('status', 'published')
        .range(from, to)
    ),
    fetchAll<ProfileRow>('profiles', (from, to) =>
      admin.from('user_profiles').select('id, username, email_community_digest').range(from, to)
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

  const isCommunity = (path: string) => path.startsWith('/community')
  const communityViews = views.filter((v) => isCommunity(String(v.path))).length
  const communitySessions = new Set(
    views.filter((v) => isCommunity(String(v.path)) && v.session_id).map((v) => v.session_id)
  ).size
  const siteSessions = new Set(views.filter((v) => v.session_id).map((v) => v.session_id)).size

  const inWindow = (iso: string) => iso >= since
  const humanPosts = allPosts.filter((p) => !isBot(p.author_id) && inWindow(p.created_at))
  const humanComments = allComments.filter((c) => !isBot(c.author_id) && inWindow(c.created_at))
  const contributors = new Set([
    ...humanPosts.map((p) => p.author_id),
    ...humanComments.map((c) => c.author_id),
  ]).size

  const names = new Map(profiles.map((p) => [p.id, p.username]))

  /**
   * The badged team accounts count as an answer; the seeded student personas do
   * not. Answering as the platform, under a visible Official badge, is the team
   * doing its job — leaving that thread on a "nobody replied" list would send
   * someone to answer it twice. A persona pretending to be a peer is the thing
   * this list exists to catch, so it still counts as silence.
   */
  const isTeam = (id: string) => isOfficialUsername(names.get(id) ?? null)
  const counts = (replierId: string, authorId: string) =>
    replierId !== authorId && (isTeam(replierId) || !isBot(replierId))

  // Indexed rather than scanned: this is O(posts x comments) with .find(), which
  // is fine at 60 rows and is not at 60,000.
  const postAuthor = new Map(allPosts.map((p) => [p.id, p.author_id]))
  const questionAuthor = new Map(allQuestions.map((q) => [q.id, q.author_id]))

  const answeredPosts = new Set<string>()
  for (const c of allComments) {
    const author = postAuthor.get(c.post_id)
    if (author && counts(c.author_id, author)) answeredPosts.add(c.post_id)
  }
  const answeredQuestions = new Set<string>()
  for (const a of allAnswers) {
    const author = questionAuthor.get(a.question_id)
    if (author && counts(a.author_id, author)) answeredQuestions.add(a.question_id)
  }

  const now = Date.now()
  const ageDays = (iso: string) => Math.floor((now - Date.parse(iso)) / 86_400_000)

  /**
   * Is there anything here a person could actually answer?
   *
   * Several of the oldest unanswered posts are "anyone?", "yo?" and an empty
   * body — someone trying the product out, not a student left hanging. Listing
   * those with the same weight as a real question trains you to ignore the
   * list, which defeats the point of having one.
   */
  const isSubstantive = (title: string, body: string | null, attachments?: unknown[] | null) => {
    const text = (body ?? '').trim()
    if (text.length >= 40) return true
    if (attachments?.length) return true
    // A short body that asks something is still worth answering — "I got 3 A's,
    // how about you?" is 35 characters and is exactly the post you want to
    // reply to. The length floor is what keeps "anyone?" and "yo?" out.
    if (text.length >= 20 && text.includes('?')) return true
    // Or the title carries the question on its own.
    return title.trim().length >= 25 && /\?|how|what|why|when|which/i.test(title)
  }

  const waiting: WaitingItem[] = [
    ...allPosts
      .filter((p) => !isBot(p.author_id) && !answeredPosts.has(p.id))
      .map((p) => ({
        kind: 'post' as const,
        id: p.id,
        title: p.title,
        author: names.get(p.author_id) ?? 'someone',
        ageDays: ageDays(p.created_at),
        substantive: isSubstantive(p.title, p.body_md, p.attachments),
      })),
    ...allQuestions
      .filter((q) => !isBot(q.author_id) && !answeredQuestions.has(q.id))
      .map((q) => ({
        kind: 'question' as const,
        id: q.id,
        title: q.title,
        author: names.get(q.author_id) ?? 'someone',
        ageDays: ageDays(q.created_at),
        substantive: isSubstantive(q.title, q.body_md),
      })),
  ].sort((a, b) => Number(b.substantive) - Number(a.substantive) || b.ageDays - a.ageDays)

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
    waiting,
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

  // Top of the report on purpose. Six of the first seven real posts never got a
  // peer reply, and that — not discovery — is what ended the June burst.
  const answerable = r.waiting.filter((w) => w.substantive)
  const thin = r.waiting.length - answerable.length

  if (answerable.length) {
    out.push(`\n⚠ ${answerable.length} real ${answerable.length === 1 ? 'person is' : 'people are'} waiting for an answer`)
    for (const w of answerable.slice(0, 12)) {
      const age = w.ageDays === 0 ? 'today' : `${w.ageDays}d ago`
      const href = w.kind === 'post' ? `/community/posts/${w.id}` : `/community/questions/${w.id}`
      out.push(`    ${age.padStart(7)}  u/${w.author.padEnd(16)} ${w.title.slice(0, 44)}`)
      out.push(`             ${href}`)
    }
    if (answerable.length > 12) out.push(`    …and ${answerable.length - 12} more`)
  } else {
    out.push('\n✓ Nothing answerable is waiting.')
  }
  if (thin) {
    out.push(`  (${thin} more unanswered, but too thin to answer — "anyone?", "yo?", empty bodies)`)
  }

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
