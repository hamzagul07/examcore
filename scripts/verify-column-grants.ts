/**
 * Asserts that server-only columns and tables are not writable by clients.
 *
 *   pnpm test:grants
 *
 * This exists because of a bug that shipped in this repo: three migrations used
 * `revoke update (col) on <table> from authenticated` to protect a column, which
 * is a **no-op when a table-wide UPDATE grant exists**. PostgreSQL tracks table
 * and column privileges separately, and a column revoke cannot subtract from a
 * table grant — so all three reported success and protected nothing.
 * `user_profiles.teacher_verified_at`, the column that hands out a free paid
 * plan, was writable by any signed-in user.
 *
 * The rules live in `public.audit_client_grants()` (it needs information_schema,
 * which PostgREST will not expose); this reports what that returns.
 */
process.loadEnvFile?.('.env.local')

// Marks the file as a module — see the note in attribution-report.ts.
export {}

type Violation = { severity: string; detail: string }

/** Both credentials are required; without them this is a skip, not a failure. */
function hasDbCredentials(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

async function main() {
  // This check needs the real database, so an offline run (a CI step with no
  // secrets, a fresh clone) skips rather than failing on a missing key — a
  // red build that means 'no credentials' teaches people to ignore red builds.
  if (!hasDbCredentials()) {
    console.log('grants — skipped (no database credentials)')
    return
  }

  const { createServiceClient } = await import('../lib/supabase/service')
  const service = createServiceClient()

  const { data, error } = await service.rpc('audit_client_grants')
  if (error) throw new Error(`audit_client_grants failed: ${error.message}`)

  const violations = (data ?? []) as Violation[]

  if (violations.length) {
    console.error(`Grant check FAILED — ${violations.length} violation(s):\n`)
    for (const v of violations) console.error(`  [${v.severity}] ${v.detail}`)
    console.error(
      '\nRemember: `revoke update (col) ...` does nothing while a table-wide grant' +
        '\nexists. Revoke the table grant, then grant back the writable columns.' +
        '\nSee supabase/migrations/20260807_user_profiles_column_grants.sql.'
    )
    process.exit(1)
  }

  console.log('grants — no client-writable server-only columns or tables')
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
