/**
 * Is the study planner being used? Read-only, prints a short report.
 *
 *   pnpm plan:report            (last 30 days of events)
 *   tsx scripts/plan-report.ts --days 7
 *
 * Plans come from study_plans; events are the funnel beacons the pages fire
 * (page_events rows with a /__funnel/plan_* path) plus /dashboard/plan views.
 */

process.loadEnvFile?.('.env.local')

type Row = Record<string, unknown>

async function main() {
  const { createClient } = await import('@supabase/supabase-js')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing')
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  const daysArg = process.argv.indexOf('--days')
  const days = daysArg >= 0 ? Number(process.argv[daysArg + 1]) || 30 : 30
  const since = new Date(Date.now() - days * 86_400_000).toISOString()
  const today = new Date().toISOString().slice(0, 10)

  // --- plans ---
  const { data: plans, error } = await admin
    .from('study_plans')
    .select('user_id, exam_date, preparedness, minutes_per_day, time_zone, blocked_dates, subjects, plan, done_days, generated_at, checkin_last_sent_at')
  if (error) throw new Error(`study_plans: ${error.message}`)
  const rows = (plans ?? []) as Row[]

  const active = rows.filter((r) => String(r.exam_date) > today)
  const byPrep = new Map<string, number>()
  const zones = new Map<string, number>()
  const subjects = new Map<string, number>()
  let withBlocked = 0
  let lengthSum = 0
  let workDays = 0
  let doneDays = 0
  let withAnyTick = 0
  let checkinsSent = 0
  let perSubjectDates = 0
  for (const r of rows) {
    byPrep.set(String(r.preparedness), (byPrep.get(String(r.preparedness)) ?? 0) + 1)
    zones.set(String(r.time_zone ?? 'UTC'), (zones.get(String(r.time_zone ?? 'UTC')) ?? 0) + 1)
    const subs = (r.subjects as Array<{ code: string; label: string; examDate?: string }>) ?? []
    for (const s of subs) subjects.set(s.label ?? s.code, (subjects.get(s.label ?? s.code) ?? 0) + 1)
    if (new Set(subs.map((s) => s.examDate).filter(Boolean)).size > 1) perSubjectDates += 1
    if (((r.blocked_dates as string[]) ?? []).length > 0) withBlocked += 1
    if (r.checkin_last_sent_at) checkinsSent += 1
    const plan = r.plan as { days?: Array<{ day: number; workMinutes: number }> } | null
    const done = (r.done_days as Record<string, boolean>) ?? {}
    const dayList = plan?.days ?? []
    lengthSum += dayList.length
    const work = dayList.filter((d) => d.workMinutes > 0)
    workDays += work.length
    const ticked = work.filter((d) => done[String(d.day)] === true).length
    doneDays += ticked
    if (ticked > 0) withAnyTick += 1
  }

  // --- events (funnel beacons + page views) ---
  const count = async (like: string) => {
    const { count: n } = await admin
      .from('page_events')
      .select('id', { count: 'exact', head: true })
      .like('path', like)
      .gte('created_at', since)
    return n ?? 0
  }
  const [built, ticks, opens, views] = await Promise.all([
    count('/__funnel/plan_built%'),
    count('/__funnel/plan_day_done%'),
    count('/__funnel/plan_checkin_opened%'),
    count('/dashboard/plan'),
  ])

  const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '—')
  const top = (m: Map<string, number>, n = 6) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} ${v}`).join(', ') || '—'

  console.log(`Study planner — ${rows.length} plans (${active.length} with the exam ahead)`)
  console.log(`  preparedness:      ${top(byPrep)}`)
  console.log(`  subjects:          ${top(subjects, 8)}`)
  console.log(`  time zones:        ${top(zones)}`)
  console.log(`  avg length:        ${rows.length ? Math.round(lengthSum / rows.length) : 0} days · avg ${rows.length ? Math.round(rows.reduce((n, r) => n + Number(r.minutes_per_day), 0) / rows.length) : 0} min/day`)
  console.log(`  days away set:     ${withBlocked} plans · per-subject dates: ${perSubjectDates} plans`)
  console.log(`  ticked:            ${doneDays} of ${workDays} study days (${pct(doneDays, workDays)}) · ${withAnyTick} plans with any tick`)
  console.log(`  check-ins sent:    ${checkinsSent} plans have had one (dry run sends none)`)
  console.log(`Last ${days} days — events`)
  console.log(`  /dashboard/plan views: ${views}`)
  console.log(`  plan_built:            ${built}`)
  console.log(`  plan_day_done:         ${ticks}`)
  console.log(`  plan_checkin_opened:   ${opens}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

// A module, not a script: keeps `main` out of the global scope shared by other scripts.
export {}
