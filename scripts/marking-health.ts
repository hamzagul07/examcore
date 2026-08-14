/**
 * The marking latency picture, in one place.
 *
 *   pnpm marking:health          # last 30 days
 *   pnpm marking:health 7        # last 7 days
 *
 * Exists because the telemetry was previously only reachable by hand-written
 * SQL, which in practice means nobody looks at it. Every number here answers a
 * question that was being guessed at:
 *
 *   - how long does a mark actually take, and how bad is the tail
 *   - which stage spends the wait (the thing `duration_ms` alone cannot say)
 *   - what retries cost, i.e. whether backend failover is earning its keep
 *   - how often students give up and leave, and get emailed instead
 *   - whether students can read their own answers (predicted vs awarded)
 */
process.loadEnvFile?.('.env.local')

// Marks the file as a module — see the note in attribution-report.ts.
export {}

type Row = {
  status: string
  duration_ms: number | null
  gemini_retries: number | null
  last_stage: string | null
  error_code: string | null
  client_disconnected: boolean | null
  predicted_marks: number | null
  stage_timings: Record<string, number> | null
  first_pass_marks: number | null
  final_marks: number | null
  has_pdf: boolean | null
  is_paid: boolean | null
}

const secs = (ms: number) => `${(ms / 1000).toFixed(0)}s`

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0
  const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length))
  return sorted[idx]
}

function bar(value: number, max: number, width = 28): string {
  if (max <= 0) return ''
  return '█'.repeat(Math.max(1, Math.round((value / max) * width)))
}

async function main() {
  const { createServiceClient } = await import('../lib/supabase/service')
  const service = createServiceClient()

  const days = Number(process.argv[2]) || 30
  const since = new Date(Date.now() - days * 86_400_000).toISOString()

  // Paged rather than `.limit(5000)`, which PostgREST silently caps at 1,000.
  // Harmless at today's volumes and quietly wrong at tomorrow's — a report that
  // stops counting at a thousand runs looks like a plateau, not a truncation.
  const { fetchAllRows } = await import('../lib/supabase/fetch-all')
  const all = await fetchAllRows<Row & { started_at: string }>(
    service,
    'mark_runs',
    'started_at, status, duration_ms, gemini_retries, last_stage, error_code, client_disconnected, predicted_marks, stage_timings, has_pdf, is_paid, first_pass_marks, final_marks'
  )
  const rows = all.filter((r) => r.started_at >= since) as Row[]
  if (!rows.length) {
    console.log(`No marks in the last ${days} days.`)
    return
  }

  const ok = rows.filter((r) => r.status === 'success')
  const durations = ok
    .map((r) => r.duration_ms ?? 0)
    .filter((d) => d > 0)
    .sort((a, b) => a - b)

  console.log(`\nMARKING HEALTH — last ${days} days (${rows.length} runs)\n`)

  // --- outcomes ---------------------------------------------------------------
  const byStatus = new Map<string, number>()
  for (const r of rows) byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1)
  console.log('Outcomes')
  for (const [status, n] of [...byStatus].sort((a, b) => b[1] - a[1])) {
    console.log(
      `  ${status.padEnd(12)} ${String(n).padStart(4)}  ${((n / rows.length) * 100).toFixed(0)}%`
    )
  }

  // --- duration ---------------------------------------------------------------
  console.log('\nDuration (successful runs)')
  console.log(`  p50  ${secs(percentile(durations, 0.5))}`)
  console.log(`  p75  ${secs(percentile(durations, 0.75))}`)
  console.log(`  p90  ${secs(percentile(durations, 0.9))}`)
  console.log(`  max  ${secs(durations[durations.length - 1] ?? 0)}`)

  // --- where the wait goes ----------------------------------------------------
  // The headline number this whole telemetry exists for: which stage to attack.
  const stageTotals = new Map<string, { total: number; runs: number }>()
  for (const r of ok) {
    for (const [stage, ms] of Object.entries(r.stage_timings ?? {})) {
      const cur = stageTotals.get(stage) ?? { total: 0, runs: 0 }
      cur.total += Number(ms) || 0
      cur.runs += 1
      stageTotals.set(stage, cur)
    }
  }
  if (stageTotals.size) {
    const ranked = [...stageTotals.entries()]
      .map(([stage, v]) => ({ stage, avg: v.total / v.runs, runs: v.runs }))
      .sort((a, b) => b.avg - a.avg)
    const worst = ranked[0].avg
    // The sample size belongs next to the number, not implied by it. Only runs
    // recorded since the timing migration carry stages, so this table can read
    // as an aggregate while resting on a single run — which is how a one-off
    // gets mistaken for a distribution and sends someone optimising the wrong
    // stage.
    const timed = ok.filter((r) => r.stage_timings).length
    console.log(`\nWhere the wait goes (mean per run, n=${timed})`)
    if (timed < 10) {
      console.log(
        `  ⚠ ${timed} run(s) only — indicative, not a distribution. Do not steer by this yet.`
      )
    }
    for (const s of ranked) {
      console.log(
        `  ${s.stage.padEnd(16)} ${secs(s.avg).padStart(5)}  ${bar(s.avg, worst)}` +
          (s.runs !== timed ? `  (n=${s.runs})` : '')
      )
    }
  } else {
    console.log(
      '\nWhere the wait goes: no stage timings yet (only runs after the 2026-08-13 migration carry them).'
    )
  }

  // --- retries ----------------------------------------------------------------
  // The comparison that justified backend failover. If failover is working,
  // these two columns should converge over time.
  const clean = ok.filter((r) => (r.gemini_retries ?? 0) === 0)
  const retried = ok.filter((r) => (r.gemini_retries ?? 0) > 0)
  const mean = (rs: Row[]) =>
    rs.length ? rs.reduce((a, r) => a + (r.duration_ms ?? 0), 0) / rs.length : 0
  console.log('\nRetry cost')
  console.log(`  no retries   ${String(clean.length).padStart(4)} runs   mean ${secs(mean(clean))}`)
  console.log(`  1+ retries   ${String(retried.length).padStart(4)} runs   mean ${secs(mean(retried))}`)
  if (clean.length && retried.length) {
    console.log(
      `  → a retried mark costs ${(mean(retried) / mean(clean)).toFixed(1)}× a clean one`
    )
  }

  // --- what the verify pass actually does --------------------------------------
  // It replaces the first pass unconditionally and in either direction, so this
  // is the only record that the two ever disagreed. A second opinion that mostly
  // moves marks down is a different product from one that mostly moves them up,
  // and until now nothing said which this was.
  const verified = ok.filter(
    (r) => typeof r.first_pass_marks === 'number' && typeof r.final_marks === 'number'
  )
  if (verified.length) {
    const moved = verified.filter((r) => r.final_marks !== r.first_pass_marks)
    const up = moved.filter((r) => (r.final_marks ?? 0) > (r.first_pass_marks ?? 0))
    const down = moved.filter((r) => (r.final_marks ?? 0) < (r.first_pass_marks ?? 0))
    const net = moved.reduce(
      (sum, r) => sum + ((r.final_marks ?? 0) - (r.first_pass_marks ?? 0)),
      0
    )
    console.log('\nWhat the verify pass changed')
    console.log(
      `  moved ${moved.length} of ${verified.length} mark(s) (${Math.round((moved.length / verified.length) * 100)}%)`
    )
    console.log(`  up ${up.length} · down ${down.length} · net ${net > 0 ? '+' : ''}${net} mark(s)`)
  } else {
    console.log(
      '\nWhat the verify pass changed: no runs recorded a first-pass score yet.'
    )
  }

  // --- students who left ------------------------------------------------------
  const left = rows.filter((r) => r.client_disconnected).length
  console.log('\nStudents who left before the mark landed')
  console.log(
    `  ${left} of ${rows.length} (${((left / rows.length) * 100).toFixed(0)}%) — these are emailed instead`
  )

  // --- failures ---------------------------------------------------------------
  const failed = rows.filter((r) => r.status !== 'success')
  if (failed.length) {
    const byCode = new Map<string, number>()
    for (const r of failed) {
      const k = `${r.error_code ?? 'unknown'} @ ${r.last_stage ?? 'unknown'}`
      byCode.set(k, (byCode.get(k) ?? 0) + 1)
    }
    console.log('\nFailures (code @ stage reached)')
    for (const [k, n] of [...byCode].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
      console.log(`  ${String(n).padStart(3)}  ${k}`)
    }
  }

  // --- self-assessment --------------------------------------------------------
  // Not a latency number, but the one that says whether the wait prompt is
  // teaching anything: a cohort that consistently over-rates itself is the
  // finding, not the individual student.
  const predicted = rows.filter((r) => typeof r.predicted_marks === 'number')
  console.log('\nScore predictions made during the wait')
  console.log(
    `  ${predicted.length} of ${rows.length} runs (${((predicted.length / rows.length) * 100).toFixed(0)}%)`
  )

  console.log('')
}

void main().catch((err) => {
  console.error(err)
  process.exit(1)
})
