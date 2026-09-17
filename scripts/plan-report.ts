/**
 * Is the study planner being used? Read-only, prints a short report.
 *
 *   pnpm plan:report            (last 30 days of events)
 *   tsx scripts/plan-report.ts --days 7
 *
 * Plans come from study_plans; events are the funnel beacons the pages fire
 * (page_events rows with a /__funnel/plan_* or /__funnel/roadmap_* path) plus
 * /dashboard/plan views, and — for v3 roadmaps — the server's own
 * study_plan_events: what was started, finished, skipped, replanned, and how
 * long it really took against what was planned.
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
    .select(
      'user_id, exam_date, preparedness, strategy, algorithm_version, feasibility_state, revision, minutes_per_day, time_zone, blocked_dates, subjects, plan, done_days, task_state, generated_at, checkin_last_sent_at, checkins_unopened'
    )
  if (error) throw new Error(`study_plans: ${error.message}`)
  const rows = (plans ?? []) as Row[]

  const active = rows.filter((r) => String(r.exam_date) > today)
  const byPrep = new Map<string, number>()
  const byStrategy = new Map<string, number>()
  const byFeasibility = new Map<string, number>()
  const zones = new Map<string, number>()
  const subjects = new Map<string, number>()
  let withBlocked = 0
  let lengthSum = 0
  let workDays = 0
  let doneDays = 0
  let withAnyTick = 0
  let checkinsSent = 0
  let perSubjectDates = 0
  let v3 = 0
  let unopenedSum = 0
  // Per plan: how many work tasks it holds, by strategy, for the completion rate.
  const plannedTasksByStrategy = new Map<string, number>()
  const strategyByUser = new Map<string, string>()
  const generatedAtByUser = new Map<string, string>()
  for (const r of rows) {
    const strategy = String(r.strategy ?? '—')
    byPrep.set(String(r.preparedness), (byPrep.get(String(r.preparedness)) ?? 0) + 1)
    byStrategy.set(strategy, (byStrategy.get(strategy) ?? 0) + 1)
    byFeasibility.set(String(r.feasibility_state ?? '—'), (byFeasibility.get(String(r.feasibility_state ?? '—')) ?? 0) + 1)
    zones.set(String(r.time_zone ?? 'UTC'), (zones.get(String(r.time_zone ?? 'UTC')) ?? 0) + 1)
    strategyByUser.set(String(r.user_id), strategy)
    generatedAtByUser.set(String(r.user_id), String(r.generated_at))
    const subs = (r.subjects as Array<{ code: string; label: string; examDate?: string }>) ?? []
    for (const s of subs) subjects.set(s.label ?? s.code, (subjects.get(s.label ?? s.code) ?? 0) + 1)
    if (new Set(subs.map((s) => s.examDate).filter(Boolean)).size > 1) perSubjectDates += 1
    if (((r.blocked_dates as string[]) ?? []).length > 0) withBlocked += 1
    if (r.checkin_last_sent_at) checkinsSent += 1
    if (Number(r.algorithm_version) >= 3) v3 += 1
    unopenedSum += Number(r.checkins_unopened ?? 0)
    const plan = r.plan as { days?: Array<{ day: number; workMinutes: number; blocks?: Array<{ kind: string }> }> } | null
    const done = (r.done_days as Record<string, boolean>) ?? {}
    const dayList = plan?.days ?? []
    lengthSum += dayList.length
    const work = dayList.filter((d) => d.workMinutes > 0)
    workDays += work.length
    const ticked = work.filter((d) => done[String(d.day)] === true).length
    doneDays += ticked
    if (ticked > 0) withAnyTick += 1
    const workTasks = dayList.reduce(
      (n, d) => n + (d.blocks ?? []).filter((b) => b.kind === 'drill' || b.kind === 'timed_paper' || b.kind === 'review' || b.kind === 'learn').length,
      0
    )
    plannedTasksByStrategy.set(strategy, (plannedTasksByStrategy.get(strategy) ?? 0) + workTasks)
  }

  // --- server events (study_plan_events) ---
  const { data: eventRows, error: eventError } = await admin
    .from('study_plan_events')
    .select('user_id, event_type, planned_minutes, actual_minutes, plan_generated_at, created_at')
    .gte('created_at', since)
    .limit(20000)
  if (eventError) console.warn(`study_plan_events: ${eventError.message} (migration not applied?)`)
  const events = (eventRows ?? []) as Row[]
  const eventCount = new Map<string, number>()
  const completedByStrategy = new Map<string, number>()
  const replansByUser = new Map<string, number>()
  let plannedSum = 0
  let actualSum = 0
  let pairs = 0
  const firstStartByUser = new Map<string, string>()
  for (const e of events) {
    const type = String(e.event_type)
    const user = String(e.user_id)
    eventCount.set(type, (eventCount.get(type) ?? 0) + 1)
    if (type === 'task_completed') {
      const s = strategyByUser.get(user) ?? '—'
      completedByStrategy.set(s, (completedByStrategy.get(s) ?? 0) + 1)
      const planned = Number(e.planned_minutes)
      const actual = Number(e.actual_minutes)
      if (planned > 0 && actual > 0) {
        plannedSum += planned
        actualSum += actual
        pairs += 1
      }
    }
    if (type === 'roadmap_replanned') replansByUser.set(user, (replansByUser.get(user) ?? 0) + 1)
    if (type === 'task_started' || type === 'task_completed') {
      const at = String(e.created_at)
      const prev = firstStartByUser.get(user)
      if (!prev || at < prev) firstStartByUser.set(user, at)
    }
  }
  let startedWithin24h = 0
  for (const [user, at] of firstStartByUser) {
    const generated = generatedAtByUser.get(user)
    if (generated && Date.parse(at) - Date.parse(generated) <= 86_400_000) startedWithin24h += 1
  }
  const replanTotal = [...replansByUser.values()].reduce((a, b) => a + b, 0)

  // --- client events (funnel beacons + page views) ---
  const count = async (like: string) => {
    const { count: n } = await admin
      .from('page_events')
      .select('id', { count: 'exact', head: true })
      .like('path', like)
      .gte('created_at', since)
    return n ?? 0
  }
  const beacons = [
    'plan_built',
    'plan_day_done',
    'plan_checkin_opened',
    'roadmap_started',
    'roadmap_generated',
    'roadmap_accepted',
    'roadmap_viewed',
    'task_started',
    'task_completed',
    'task_skipped',
    'task_swapped',
    'roadmap_replanned',
    'why_this_task_opened',
    'reminder_clicked',
    'plan_felt_realistic',
    'understood_why',
  ]
  const [views, ...beaconCounts] = await Promise.all([count('/dashboard/plan'), ...beacons.map((b) => count(`/__funnel/${b}%`))])

  const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '—')
  const top = (m: Map<string, number>, n = 6) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} ${v}`).join(', ') || '—'

  console.log(`Study planner — ${rows.length} plans (${active.length} with the exam ahead, ${v3} roadmaps)`)
  console.log(`  preparedness:      ${top(byPrep)}`)
  console.log(`  strategy:          ${top(byStrategy)}`)
  console.log(`  feasibility:       ${top(byFeasibility)}`)
  console.log(`  subjects:          ${top(subjects, 8)}`)
  console.log(`  time zones:        ${top(zones)}`)
  console.log(`  avg length:        ${rows.length ? Math.round(lengthSum / rows.length) : 0} days · avg ${rows.length ? Math.round(rows.reduce((n, r) => n + Number(r.minutes_per_day), 0) / rows.length) : 0} min/day`)
  console.log(`  days away set:     ${withBlocked} plans · per-subject dates: ${perSubjectDates} plans`)
  console.log(`  ticked:            ${doneDays} of ${workDays} study days (${pct(doneDays, workDays)}) · ${withAnyTick} plans with any tick`)
  console.log(`  check-ins sent:    ${checkinsSent} plans have had one (dry run sends none)`)
  console.log(`  check-in opens:    ${checkinsSent} plans sent to · ${unopenedSum} unopened across plans · ${pct(checkinsSent - Math.min(checkinsSent, unopenedSum), checkinsSent)} opened their latest`)
  console.log(`Last ${days} days — roadmap events (study_plan_events)`)
  const completionLines = [...plannedTasksByStrategy.entries()]
    .filter(([s]) => s !== '—')
    .map(([s, planned]) => `${s} ${completedByStrategy.get(s) ?? 0}/${planned} (${pct(completedByStrategy.get(s) ?? 0, planned)})`)
  console.log(`  completion by strategy: ${completionLines.join(' · ') || '—'}`)
  console.log(`  replan rate:       ${replanTotal} replans across ${replansByUser.size} plans (${v3 ? (replanTotal / v3).toFixed(2) : '—'} per roadmap)`)
  console.log(`  planned vs actual: ${pairs ? `${(actualSum / plannedSum).toFixed(2)}× (${pairs} completed tasks with both)` : '—'}`)
  console.log(`  first task ≤ 24 h: ${startedWithin24h} of ${v3} roadmaps (${pct(startedWithin24h, v3)})`)
  console.log(`  events:            ${top(eventCount, 12)}`)
  console.log(`Last ${days} days — client events`)
  console.log(`  /dashboard/plan views: ${views}`)
  beacons.forEach((b, i) => console.log(`  ${(b + ':').padEnd(23)}${beaconCounts[i]}`))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

// A module, not a script: keeps `main` out of the global scope shared by other scripts.
export {}
