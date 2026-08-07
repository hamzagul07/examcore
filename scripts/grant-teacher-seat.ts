/**
 * Grants (or revokes) a teacher seat.
 *
 *   pnpm teacher:grant  teacher@school.sch.uk "outreach: Harrow, Chemistry"
 *   pnpm teacher:grant  teacher@school.sch.uk --revoke
 *   pnpm teacher:grant  --list
 *
 * Seats are granted here rather than claimed in the product on purpose: the
 * allowance is worth real money, and `user_profiles.role` — the field a user
 * picks during onboarding — is not evidence of anything. See
 * supabase/migrations/20260807_teacher_seats.sql.
 */
process.loadEnvFile?.('.env.local')

// Marks the file as a module — see the note in attribution-report.ts.
export {}

type Profile = {
  id: string
  full_name: string | null
  teacher_verified_at: string | null
  teacher_verified_reason: string | null
}

async function main() {
  const { createServiceClient } = await import('../lib/supabase/service')
  const service = createServiceClient()

  const [target, ...rest] = process.argv.slice(2)
  if (!target) {
    console.error('Usage: pnpm teacher:grant <email> [reason] | <email> --revoke | --list')
    process.exit(1)
  }

  if (target === '--list') {
    const { data, error } = await service
      .from('user_profiles')
      .select('id, full_name, teacher_verified_at, teacher_verified_reason')
      .not('teacher_verified_at', 'is', null)
      .order('teacher_verified_at', { ascending: false })
    if (error) throw new Error(error.message)

    const rows = (data ?? []) as Profile[]
    if (!rows.length) {
      console.log('No teacher seats granted yet.')
      return
    }
    console.log(`${rows.length} teacher seat(s):\n`)
    for (const r of rows) {
      const email = await emailFor(service, r.id)
      console.log(
        `  ${(email ?? r.id).padEnd(38)} ${r.teacher_verified_at?.slice(0, 10)}  ${r.teacher_verified_reason ?? ''}`
      )
    }
    return
  }

  const revoke = rest.includes('--revoke')
  const reason = rest.filter((a) => a !== '--revoke').join(' ').trim()

  if (!revoke && !reason) {
    console.error(
      'A reason is required so the seat list stays auditable, e.g. "outreach: Harrow, Chemistry".'
    )
    process.exit(1)
  }

  const userId = await userIdForEmail(service, target)
  if (!userId) {
    console.error(`No account found for ${target}. They must sign up first.`)
    process.exit(1)
  }

  const { error } = await service
    .from('user_profiles')
    .update(
      revoke
        ? { teacher_verified_at: null, teacher_verified_reason: null }
        : { teacher_verified_at: new Date().toISOString(), teacher_verified_reason: reason }
    )
    .eq('id', userId)

  if (error) throw new Error(error.message)
  console.log(revoke ? `Revoked teacher seat for ${target}.` : `Granted teacher seat to ${target} — ${reason}`)
}

/** Paged listUsers: the admin API has no lookup-by-email. */
async function userIdForEmail(
  service: Awaited<ReturnType<typeof import('../lib/supabase/service')['createServiceClient']>>,
  email: string
): Promise<string | null> {
  const wanted = email.trim().toLowerCase()
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(error.message)
    const hit = data.users.find((u) => u.email?.toLowerCase() === wanted)
    if (hit) return hit.id
    if (data.users.length < 200) break
  }
  return null
}

async function emailFor(
  service: Awaited<ReturnType<typeof import('../lib/supabase/service')['createServiceClient']>>,
  userId: string
): Promise<string | null> {
  const { data } = await service.auth.admin.getUserById(userId)
  return data?.user?.email ?? null
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
