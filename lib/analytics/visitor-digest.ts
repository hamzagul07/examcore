// Daily "visitor journeys" digest — one admin email summarizing each signed-in
// user's page journey and approximate time spent over a day window. Server-only
// (service-role client + admin auth lookups).
import { createServiceClient } from '@/lib/supabase/service'
import { adminNotifyAddress, sendEmail } from '@/lib/email/send'
import { SITE_NAME } from '@/lib/site-config'

const MAX_USERS = 200 // cap per email so a busy day can't produce a giant message
const MAX_PATHS_PER_USER = 40

type Row = { user_id: string; path: string; dwell_ms: number; created_at: string }

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
): Promise<{ sent: boolean; users: number; events: number }> {
  const supabase = createServiceClient()
  const { startISO, endISO, label } = yesterdayWindow(now)

  const { data, error } = await supabase
    .from('page_events')
    .select('user_id, path, dwell_ms, created_at')
    .gte('created_at', startISO)
    .lt('created_at', endISO)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`visitor-digest query failed: ${error.message}`)
  const rows = (data ?? []) as Row[]
  if (rows.length === 0) return { sent: false, users: 0, events: 0 }

  // Group into ordered per-user journeys.
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

  // Busiest users first.
  const users = [...byUser.entries()].sort((a, b) => b[1].total - a[1].total)
  const shown = users.slice(0, MAX_USERS)

  // Resolve emails (best-effort; fall back to the user id).
  const lines: string[] = [
    `Visitor journeys for ${label} (UTC).`,
    `${users.length} signed-in user${users.length === 1 ? '' : 's'} · ${rows.length} page views.`,
    '',
  ]

  for (const [userId, info] of shown) {
    let who = userId
    try {
      const { data: authData } = await supabase.auth.admin.getUserById(userId)
      if (authData?.user?.email) who = authData.user.email
    } catch {
      // keep the user id
    }
    lines.push(`• ${who} — ${fmtMinutes(info.total)} total`)
    const steps = info.steps.slice(0, MAX_PATHS_PER_USER)
    for (const s of steps) {
      lines.push(`    ${s.path} (${fmtMinutes(s.ms)})`)
    }
    if (info.steps.length > steps.length) {
      lines.push(`    …and ${info.steps.length - steps.length} more`)
    }
    lines.push('')
  }
  if (users.length > shown.length) {
    lines.push(`(+${users.length - shown.length} more users omitted)`)
  }

  await sendEmail({
    to: adminNotifyAddress(),
    subject: `[${SITE_NAME}] Visitor journeys — ${label}`,
    preheader: `${users.length} users · ${rows.length} page views`,
    text: lines.join('\n'),
  })

  return { sent: true, users: users.length, events: rows.length }
}
