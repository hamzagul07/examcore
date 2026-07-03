// Daily activity digest — one admin email with (1) new signups that day and
// (2) each signed-in user's page journey + approximate time spent. Server-only
// (service-role client + admin auth lookups).
import { createServiceClient } from '@/lib/supabase/service'
import { adminNotifyAddress, sendEmail } from '@/lib/email/send'
import { SITE_NAME } from '@/lib/site-config'

const MAX_USERS = 200 // cap per email so a busy day can't produce a giant message
const MAX_PATHS_PER_USER = 40
const MAX_SIGNUPS = 200

type Row = { user_id: string; path: string; dwell_ms: number; created_at: string }
type Signup = { id: string; email: string | null; created_at: string }

function fmtMinutes(ms: number): string {
  const totalSec = Math.round(ms / 1000)
  if (totalSec < 60) return `${totalSec}s`
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return s ? `${m}m ${s}s` : `${m}m`
}

/** UTC day window [start, end) ending at midnight UTC of `now`'s date. */
function yesterdayWindow(now: Date): { startISO: string; endISO: string; label: string } {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000)
  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    label: start.toISOString().slice(0, 10),
  }
}

export async function sendVisitorDigest(
  now: Date = new Date()
): Promise<{ sent: boolean; signups: number; users: number; events: number }> {
  const supabase = createServiceClient()
  const { startISO, endISO, label } = yesterdayWindow(now)

  const [eventsRes, signupsRes] = await Promise.all([
    supabase
      .from('page_events')
      .select('user_id, path, dwell_ms, created_at')
      .gte('created_at', startISO)
      .lt('created_at', endISO)
      .order('created_at', { ascending: true }),
    supabase.rpc('signups_between', { p_start: startISO, p_end: endISO }),
  ])

  if (eventsRes.error) throw new Error(`visitor-digest events query failed: ${eventsRes.error.message}`)
  if (signupsRes.error) throw new Error(`visitor-digest signups query failed: ${signupsRes.error.message}`)

  const rows = (eventsRes.data ?? []) as Row[]
  const signups = (signupsRes.data ?? []) as Signup[]

  // Nothing happened → don't send an empty email.
  if (rows.length === 0 && signups.length === 0) {
    return { sent: false, signups: 0, users: 0, events: 0 }
  }

  const lines: string[] = [`Daily summary for ${label} (UTC).`, '']

  // ── New signups ──────────────────────────────────────────────────────────
  lines.push(`New signups: ${signups.length}`)
  for (const s of signups.slice(0, MAX_SIGNUPS)) {
    lines.push(`  • ${s.email ?? s.id}`)
  }
  if (signups.length > MAX_SIGNUPS) {
    lines.push(`  …and ${signups.length - MAX_SIGNUPS} more`)
  }
  lines.push('')

  // ── Visitor journeys ─────────────────────────────────────────────────────
  const byUser = new Map<string, { total: number; steps: { path: string; ms: number }[] }>()
  for (const r of rows) {
    let u = byUser.get(r.user_id)
    if (!u) {
      u = { total: 0, steps: [] }
      byUser.set(r.user_id, u)
    }
    u.total += r.dwell_ms
    u.steps.push({ path: r.path, ms: r.dwell_ms })
  }

  const users = [...byUser.entries()].sort((a, b) => b[1].total - a[1].total)

  lines.push(
    `Visitor journeys: ${users.length} signed-in user${users.length === 1 ? '' : 's'} · ${rows.length} page views`
  )
  if (users.length === 0) {
    lines.push('  (no tracked page activity — tracking only records visits after deploy)')
  }

  for (const [userId, info] of users.slice(0, MAX_USERS)) {
    let who = userId
    try {
      const { data: authData } = await supabase.auth.admin.getUserById(userId)
      if (authData?.user?.email) who = authData.user.email
    } catch {
      // keep the user id
    }
    lines.push('', `• ${who} — ${fmtMinutes(info.total)} total`)
    const steps = info.steps.slice(0, MAX_PATHS_PER_USER)
    for (const s of steps) lines.push(`    ${s.path} (${fmtMinutes(s.ms)})`)
    if (info.steps.length > steps.length) {
      lines.push(`    …and ${info.steps.length - steps.length} more`)
    }
  }
  if (users.length > MAX_USERS) {
    lines.push('', `(+${users.length - MAX_USERS} more users omitted)`)
  }

  await sendEmail({
    to: adminNotifyAddress(),
    subject: `[${SITE_NAME}] Daily summary — ${label}`,
    preheader: `${signups.length} signups · ${users.length} active users · ${rows.length} page views`,
    text: lines.join('\n'),
  })

  return { sent: true, signups: signups.length, users: users.length, events: rows.length }
}
