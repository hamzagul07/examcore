// Daily activity digest — one admin email with (1) new signups that day,
// (2) active/returning users (existing users who marked or visited that day),
// and their page journeys + approximate time. Server-only (service-role client
// + admin auth lookups).
import { createServiceClient } from '@/lib/supabase/service'
import { adminNotifyAddress, sendEmail } from '@/lib/email/send'
import { SITE_NAME } from '@/lib/site-config'

const MAX_LIST = 200 // cap each section so a busy day can't produce a giant email
const MAX_PATHS_PER_USER = 40

type EventRow = { user_id: string; path: string; dwell_ms: number }
type UsageRow = { user_id: string; event_type: string }
type Signup = { id: string; email: string | null }

type Activity = {
  marks: number
  chats: number
  visitMs: number
  steps: { path: string; ms: number }[]
}

function fmt(ms: number): string {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return r ? `${m}m ${r}s` : `${m}m`
}

/** UTC day window [start, end) ending at midnight UTC of `now`'s date. */
function yesterdayWindow(now: Date): { startISO: string; endISO: string; label: string } {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000)
  return { startISO: start.toISOString(), endISO: end.toISOString(), label: start.toISOString().slice(0, 10) }
}

function activityScore(a: Activity): number {
  return a.marks * 100 + a.chats * 10 + a.visitMs / 60000
}

function activitySummary(a: Activity): string {
  const parts: string[] = []
  if (a.marks) parts.push(`${a.marks} mark${a.marks === 1 ? '' : 's'}`)
  if (a.chats) parts.push(`${a.chats} chat${a.chats === 1 ? '' : 's'}`)
  if (a.visitMs > 0 || a.steps.length) {
    parts.push(`${fmt(a.visitMs)} across ${a.steps.length} page${a.steps.length === 1 ? '' : 's'}`)
  }
  return parts.join(' · ') || 'no tracked activity'
}

export async function sendVisitorDigest(
  now: Date = new Date()
): Promise<{ sent: boolean; signups: number; returning: number; events: number }> {
  const supabase = createServiceClient()
  const { startISO, endISO, label } = yesterdayWindow(now)

  const [eventsRes, usageRes, signupsRes] = await Promise.all([
    supabase
      .from('page_events')
      .select('user_id, path, dwell_ms, created_at')
      .gte('created_at', startISO)
      .lt('created_at', endISO)
      .order('created_at', { ascending: true }),
    supabase
      .from('usage_events')
      .select('user_id, event_type, created_at')
      .in('event_type', ['mark_single', 'mark_whole_paper', 'omni_message'])
      .gte('created_at', startISO)
      .lt('created_at', endISO),
    supabase.rpc('signups_between', { p_start: startISO, p_end: endISO }),
  ])

  if (eventsRes.error) throw new Error(`digest events query failed: ${eventsRes.error.message}`)
  if (usageRes.error) throw new Error(`digest usage query failed: ${usageRes.error.message}`)
  if (signupsRes.error) throw new Error(`digest signups query failed: ${signupsRes.error.message}`)

  const events = (eventsRes.data ?? []) as EventRow[]
  const usage = (usageRes.data ?? []) as UsageRow[]
  const signups = (signupsRes.data ?? []) as Signup[]

  if (events.length === 0 && usage.length === 0 && signups.length === 0) {
    return { sent: false, signups: 0, returning: 0, events: 0 }
  }

  // Per-user activity (marks/chats from usage_events, visits from page_events).
  const act = new Map<string, Activity>()
  const get = (id: string): Activity => {
    let a = act.get(id)
    if (!a) {
      a = { marks: 0, chats: 0, visitMs: 0, steps: [] }
      act.set(id, a)
    }
    return a
  }
  for (const u of usage) {
    const a = get(u.user_id)
    if (u.event_type === 'omni_message') a.chats += 1
    else a.marks += 1
  }
  for (const e of events) {
    const a = get(e.user_id)
    a.visitMs += e.dwell_ms
    a.steps.push({ path: e.path, ms: e.dwell_ms })
  }

  const signupIds = new Set(signups.map((s) => s.id))

  // Resolve an email for a user id (best-effort; falls back to the id).
  const emailCache = new Map<string, string>()
  const emailFor = async (id: string): Promise<string> => {
    if (emailCache.has(id)) return emailCache.get(id)!
    let who = id
    try {
      const { data } = await supabase.auth.admin.getUserById(id)
      if (data?.user?.email) who = data.user.email
    } catch {
      // keep id
    }
    emailCache.set(id, who)
    return who
  }

  const lines: string[] = [`Daily summary for ${label} (UTC).`, '']

  // ── New signups ────────────────────────────────────────────────────────
  lines.push(`New signups: ${signups.length}`)
  for (const s of signups.slice(0, MAX_LIST)) {
    const a = act.get(s.id)
    const suffix = a ? ` — ${activitySummary(a)}` : ''
    lines.push(`  • ${s.email ?? s.id}${suffix}`)
  }
  if (signups.length > MAX_LIST) lines.push(`  …and ${signups.length - MAX_LIST} more`)
  lines.push('')

  // ── Active / returning users (existing users active today) ───────────────
  const returning = [...act.entries()]
    .filter(([id]) => !signupIds.has(id))
    .sort((a, b) => activityScore(b[1]) - activityScore(a[1]))

  lines.push(`Active / returning users: ${returning.length}`)
  if (returning.length === 0) {
    lines.push('  (none — no marks or tracked visits from existing users)')
  }
  for (const [id, a] of returning.slice(0, MAX_LIST)) {
    const who = await emailFor(id)
    lines.push('', `• ${who} — ${activitySummary(a)}`)
    const steps = a.steps.slice(0, MAX_PATHS_PER_USER)
    for (const s of steps) lines.push(`    ${s.path} (${fmt(s.ms)})`)
    if (a.steps.length > steps.length) lines.push(`    …and ${a.steps.length - steps.length} more`)
  }
  if (returning.length > MAX_LIST) lines.push('', `(+${returning.length - MAX_LIST} more omitted)`)

  await sendEmail({
    to: adminNotifyAddress(),
    subject: `[${SITE_NAME}] Daily summary — ${label}`,
    preheader: `${signups.length} signups · ${returning.length} returning · ${events.length} page views`,
    text: lines.join('\n'),
  })

  return { sent: true, signups: signups.length, returning: returning.length, events: events.length }
}
