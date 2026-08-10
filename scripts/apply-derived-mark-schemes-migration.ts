/**
 * Apply supabase/migrations/20260810_derived_mark_schemes.sql to the remote DB.
 *
 * Needs the database password (Project Settings → Database → Database password):
 *
 *   SUPABASE_DB_PASSWORD='…' npx tsx scripts/apply-derived-mark-schemes-migration.ts
 *
 * Optional: SUPABASE_DB_HOST (defaults to db.<project-ref>.supabase.co)
 */
import { readFileSync } from 'fs'
import postgres from 'postgres'

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq < 0) continue
  const k = t.slice(0, eq).trim()
  let v = t.slice(eq + 1).trim()
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1)
  }
  if (process.env[k] === undefined) process.env[k] = v
}

async function main() {
  const password = process.env.SUPABASE_DB_PASSWORD?.trim()
  if (!password) {
    console.error(
      'Set SUPABASE_DB_PASSWORD (Supabase → Project Settings → Database) and re-run.'
    )
    process.exit(2)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    console.error('NEXT_PUBLIC_SUPABASE_URL missing')
    process.exit(2)
  }
  const ref = new URL(url).hostname.split('.')[0]
  const host = process.env.SUPABASE_DB_HOST || `db.${ref}.supabase.co`
  const sqlText = readFileSync(
    'supabase/migrations/20260810_derived_mark_schemes.sql',
    'utf8'
  )

  const connection = `postgresql://postgres:${encodeURIComponent(password)}@${host}:5432/postgres`
  const sql = postgres(connection, { ssl: 'require', max: 1 })
  try {
    await sql.unsafe(sqlText)
    const rows = await sql`
      select fingerprint from public.derived_mark_schemes limit 0
    `
    console.log('Migration applied. derived_mark_schemes is ready.', {
      host,
      probe: rows.length,
    })
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
