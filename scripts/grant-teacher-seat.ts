/**
 * Grants (or revokes) a teacher seat, and works the request queue.
 *
 *   pnpm teacher:grant  --list                          # seats currently granted
 *   pnpm teacher:grant  --pending                       # open requests, oldest first
 *   pnpm teacher:grant  --approve teacher@school.uk     # grant + close the request
 *   pnpm teacher:grant  --decline teacher@school.uk "no school domain"
 *   pnpm teacher:grant  teacher@school.uk "outreach: Harrow, Chemistry"
 *   pnpm teacher:grant  teacher@school.uk --revoke
 *
 * Seats are granted here rather than claimed in the product on purpose: the
 * allowance is worth real money, and `user_profiles.role` — the field a user
 * picks during onboarding — is not evidence of anything. See
 * supabase/migrations/20260807_teacher_seats.sql.
 *
 * What changed on 2026-09-06 is only who starts the conversation. Teachers can
 * now ask (supabase/migrations/20260906_teacher_seat_requests.sql), and this
 * script is where the asking gets answered. The evidence bar is unmoved: a
 * human still reads the school details and decides.
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

type SeatRequest = {
  id: string
  user_id: string
  school_name: string
  school_email: string
  school_country: string | null
  role_title: string | null
  class_size: number | null
  created_at: string
}

type Service = Awaited<
  ReturnType<(typeof import('../lib/supabase/service'))['createServiceClient']>
>

async function main() {
  const { createServiceClient } = await import('../lib/supabase/service')
  const service = createServiceClient()

  const [target, ...rest] = process.argv.slice(2)
  if (!target) {
    console.error(
      'Usage: pnpm teacher:grant <email> [reason] | <email> --revoke | --list | --pending | --approve <email> [reason] | --decline <email> [reason]'
    )
    process.exit(1)
  }

  if (target === '--list') {
    await listSeats(service)
    return
  }

  if (target === '--pending') {
    await listPending(service)
    return
  }

  if (target === '--approve' || target === '--decline') {
    const [email, ...reasonParts] = rest
    if (!email) {
      console.error(`Usage: pnpm teacher:grant ${target} <email> [reason]`)
      process.exit(1)
    }
    await reviewRequest(service, {
      email,
      approve: target === '--approve',
      reason: reasonParts.join(' ').trim(),
    })
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

  await setSeat(service, { userId, revoke, reason })

  // A hand-granted seat answers any open request too, or the queue would keep
  // showing a teacher who already has what they asked for.
  if (!revoke) {
    await closeRequest(service, userId, 'approved', reason)
  }

  console.log(
    revoke
      ? `Revoked teacher seat for ${target}.`
      : `Granted teacher seat to ${target} — ${reason}`
  )
}

async function listSeats(service: Service) {
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
}

/**
 * The queue, oldest first — a teacher who has been waiting three days is the
 * one to answer, not the one who applied this morning.
 */
async function listPending(service: Service) {
  const { data, error } = await service
    .from('teacher_seat_requests')
    .select(
      'id, user_id, school_name, school_email, school_country, role_title, class_size, created_at'
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as SeatRequest[]
  if (!rows.length) {
    console.log('No open teacher seat requests.')
    return
  }

  console.log(`${rows.length} open request(s):\n`)
  for (const r of rows) {
    const accountEmail = await emailFor(service, r.user_id)
    const waited = Math.floor(
      (Date.now() - new Date(r.created_at).getTime()) / 86_400_000
    )
    console.log(`  ${r.school_name}`)
    console.log(`    account:  ${accountEmail ?? r.user_id}`)
    console.log(`    school:   ${r.school_email}`)
    if (r.role_title) console.log(`    role:     ${r.role_title}`)
    if (r.class_size) console.log(`    students: ${r.class_size}`)
    if (r.school_country) console.log(`    country:  ${r.school_country}`)
    console.log(`    waiting:  ${waited} day(s)`)
    console.log(
      `    approve:  pnpm teacher:grant --approve ${accountEmail ?? '<email>'}\n`
    )
  }
}

async function reviewRequest(
  service: Service,
  opts: { email: string; approve: boolean; reason: string }
) {
  const userId = await userIdForEmail(service, opts.email)
  if (!userId) {
    console.error(`No account found for ${opts.email}. They must sign up first.`)
    process.exit(1)
  }

  const { data: request, error } = await service
    .from('teacher_seat_requests')
    .select('id, school_name, school_email')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .maybeSingle()
  if (error) throw new Error(error.message)

  if (!request) {
    console.error(
      `No open request for ${opts.email}. Use "pnpm teacher:grant ${opts.email} \"<reason>\"" to grant a seat without one.`
    )
    process.exit(1)
  }

  // The school they gave us is the audit trail, so it becomes the reason when
  // the reviewer does not type one — never an empty string, which is what made
  // the reason mandatory on the manual path in the first place.
  const reason =
    opts.reason || `request: ${request.school_name} (${request.school_email})`

  if (opts.approve) {
    await setSeat(service, { userId, revoke: false, reason })
  }

  await closeRequest(
    service,
    userId,
    opts.approve ? 'approved' : 'declined',
    reason
  )

  if (!opts.approve) {
    console.log(`Declined ${opts.email} (${reason}). No seat granted.`)
    return
  }

  // The desk tells the teacher "we'll email you the moment yours is on", so
  // this send is part of approving, not a nicety. Awaited — the process exits
  // before a fire-and-forget request would leave the machine.
  const { sendTeacherSeatApprovedEmail } = await import('../lib/email/notifications')
  const { teacherMarkCap } = await import('../lib/billing/caps')
  const sent = await sendTeacherSeatApprovedEmail({
    email: opts.email,
    teacherCap: teacherMarkCap(),
  }).catch((err) => {
    console.error('[teacher:grant] approval email failed:', err)
    return false
  })

  console.log(`Approved ${opts.email} — seat granted (${reason}).`)
  if (!sent) {
    console.warn(
      '  ⚠ Approval email was not sent (RESEND_API_KEY unset, or the send failed).'
    )
    console.warn('    Tell them by hand — they are waiting on it.')
  }
}

async function setSeat(
  service: Service,
  opts: { userId: string; revoke: boolean; reason: string }
) {
  const { error } = await service
    .from('user_profiles')
    .update(
      opts.revoke
        ? { teacher_verified_at: null, teacher_verified_reason: null }
        : {
            teacher_verified_at: new Date().toISOString(),
            teacher_verified_reason: opts.reason,
          }
    )
    .eq('id', opts.userId)

  if (error) throw new Error(error.message)
}

async function closeRequest(
  service: Service,
  userId: string,
  status: 'approved' | 'declined',
  reason: string
) {
  const { error } = await service
    .from('teacher_seat_requests')
    .update({
      status,
      reviewed_reason: reason,
      reviewed_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('status', 'pending')

  if (error) throw new Error(error.message)
}

/** Paged listUsers: the admin API has no lookup-by-email. */
async function userIdForEmail(
  service: Service,
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

async function emailFor(service: Service, userId: string): Promise<string | null> {
  const { data } = await service.auth.admin.getUserById(userId)
  return data?.user?.email ?? null
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
