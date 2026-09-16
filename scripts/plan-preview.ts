/**
 * Preview the study plan the engine would build for a real student — the
 * whole data path (their weak topics, the subject's high-yield topics, the
 * hydration into real questions) — without writing a row.
 *
 *   cross-env NODE_OPTIONS=--conditions=react-server tsx scripts/plan-preview.ts \
 *     [--user <uuid>] [--subjects 9709,9702] [--days 19] [--prep pass|secure|stretch] \
 *     [--minutes 90] [--show 4]
 *
 * Without --user it picks the account with the most attempts. Prints topic
 * sources and the first few days with their links, and a count of drill
 * blocks that could not be pointed at a banked question.
 *
 * --email <path> also renders the morning check-in for day 2 of that plan to
 * an HTML file, for a look in a browser without sending anything.
 */

process.loadEnvFile?.('.env.local')

async function main() {
  const { createClient } = await import('@supabase/supabase-js')
  const { buildStudyPlan } = await import('@/lib/plan/build-study-plan')
  const { hydrateStudyPlan, resolvePlanSubjects } = await import('@/lib/plan/study-plan-service')
  const { isoDate, workBlocks } = await import('@/lib/plan/plan-view')

  const arg = (name: string, fallback: string) => {
    const i = process.argv.indexOf(`--${name}`)
    return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback
  }
  const subjects = arg('subjects', '9709').split(',').map((s) => s.trim()).filter(Boolean)
  const days = Number(arg('days', '19'))
  const prep = arg('prep', 'pass') as 'pass' | 'secure' | 'stretch'
  const minutes = Number(arg('minutes', '90'))
  const show = Number(arg('show', '4'))

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing')
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  let userId = arg('user', '')
  if (!userId) {
    const { data, error } = await admin
      .from('attempts')
      .select('user_id')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw new Error(`attempts query failed: ${error.message}`)
    console.log(`attempts scanned: ${data?.length ?? 0}`)
    const counts = new Map<string, number>()
    // Guest marks carry no user_id and outnumber signed-in ones.
    for (const r of data ?? []) {
      const id = r.user_id as string | null
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    userId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
    if (!userId) throw new Error('no attempts to pick a user from')
    console.log(`user: (most-attempts account, ${counts.get(userId)} recent attempts)`)
  }

  const start = isoDate(new Date())
  const exam = isoDate(new Date(Date.now() + days * 86_400_000))
  const t0 = Date.now()
  const inputs = await resolvePlanSubjects(admin, userId, subjects)
  console.log(`resolved subjects in ${Date.now() - t0} ms`)
  for (const s of inputs) {
    console.log(`\n${s.code} ${s.label} — timed paper: ${s.hasTimedPaper}`)
    console.log(`  high-yield: ${s.highYield.map((t) => `${t.code} ${t.name} (${t.weight})`).join(', ') || '—'}`)
    console.log(`  weak:       ${s.weak.map((t) => `${t.code} ${t.name} (${t.weight}%)`).join(', ') || '—'}`)
  }

  const plan = buildStudyPlan({
    startDate: start,
    examDate: exam,
    preparedness: prep,
    minutesPerDay: minutes,
    availability: [minutes, minutes, minutes, minutes, minutes, minutes, minutes],
    subjects: inputs,
  })
  const t1 = Date.now()
  const hydrated = await hydrateStudyPlan(admin, plan)
  console.log(`\nhydrated ${hydrated.days.length} days in ${Date.now() - t1} ms`)
  console.log(hydrated.headline)

  let drills = 0
  let banked = 0
  for (const d of hydrated.days) {
    for (const b of workBlocks(d)) {
      if (b.kind !== 'drill') continue
      drills += 1
      if (b.href?.includes('practice=1')) banked += 1
    }
  }
  console.log(`drills: ${drills}, pointing at a banked question: ${banked}`)

  for (const d of hydrated.days.slice(0, show)) {
    console.log(`\nDay ${d.day} · ${d.date} · ${d.kind} · ${d.workMinutes} min — ${d.focus}`)
    for (const b of d.blocks) {
      if (b.kind === 'break') {
        console.log(`    · ${b.label}`)
        continue
      }
      console.log(`  ${String(b.minutes).padStart(3)}′ ${b.label}`)
      if (b.resourceLabel || b.href) console.log(`       ${b.resourceLabel ?? ''} ${b.href ?? ''}`)
    }
  }
  const last = hydrated.days[hydrated.days.length - 1]
  if (last) console.log(`\nDay ${last.day} · ${last.date} · ${last.kind} — ${last.focus}`)

  const emailPath = arg('email', '')
  if (emailPath) {
    const { renderPlanCheckinEmail } = await import('@/lib/email/plan-checkin')
    const { planProgress, checkinLine } = await import('@/lib/plan/plan-view')
    const { writeFileSync } = await import('node:fs')
    const day = hydrated.days.find((d) => d.kind === 'study') ?? hydrated.days[0]!
    const done = { '1': true }
    const progress = planProgress(hydrated, done, day.date)
    const rendered = renderPlanCheckinEmail({
      recipientName: 'Aisha',
      day,
      line: checkinLine(day, progress),
      progress,
      unsubscribeHref: 'https://markscheme.app/email/unsubscribe?token=preview',
    })
    writeFileSync(emailPath, rendered.html)
    console.log(`\nemail: "${rendered.subject}" → ${emailPath}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

// A module, not a script: keeps `main` out of the global scope shared by other scripts.
export {}
