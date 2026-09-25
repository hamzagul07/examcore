/**
 * Grants (or revokes) a teacher seat, and works the request queue.
 *
 *   pnpm teacher:grant  --list                          # seats currently granted
 *   pnpm teacher:grant  --pending                       # open requests, oldest first
 *   pnpm teacher:grant  --approve teacher@school.uk     # grant + close the request + email
 *   pnpm teacher:grant  --decline teacher@school.uk "Please apply with your school email"
 *   pnpm teacher:grant  teacher@school.uk "outreach: Harrow, Chemistry"
 *   pnpm teacher:grant  teacher@school.uk --revoke
 *
 * The same queue is at /admin/teacher-seats. Both are thin: the decision
 * logic — who may be approved, what is written in which order, what the
 * teacher is told — lives in lib/teacher/seat-grant.ts, so the page and this
 * script cannot drift apart.
 *
 * Seats are granted by a person, never claimed: the allowance is worth real
 * money and `user_profiles.role` is self-declared. See
 * supabase/migrations/20260807_teacher_seats.sql and 20260906_teacher_seat_requests.sql.
 */
process.loadEnvFile?.('.env.local')

// Marks the file as a module — see the note in attribution-report.ts.
export {}

const USAGE =
  'Usage: pnpm teacher:grant <email> <reason> | <email> --revoke | --list | --pending | --approve <email> [reason] | --decline <email> <reason>'

async function main() {
  const { createServiceClient } = await import('../lib/supabase/service')
  const seat = await import('../lib/teacher/seat-grant')
  const { capForTier, teacherMarkCap } = await import('../lib/billing/caps')
  const service = createServiceClient()

  const [target, ...rest] = process.argv.slice(2)
  if (!target) fail(USAGE)

  if (target === '--list') {
    const { data, error } = await service
      .from('user_profiles')
      .select('id, teacher_verified_at, teacher_verified_reason')
      .not('teacher_verified_at', 'is', null)
      .order('teacher_verified_at', { ascending: false })
    if (error) throw new Error(error.message)
    if (!data?.length) return console.log('No teacher seats granted yet.')
    console.log(`${data.length} teacher seat(s):\n`)
    for (const r of data) {
      const email = await seat.accountEmail(service, r.id as string)
      console.log(
        `  ${(email ?? (r.id as string)).padEnd(38)} ${String(r.teacher_verified_at).slice(0, 10)}  ${r.teacher_verified_reason ?? ''}`
      )
    }
    return
  }

  if (target === '--pending') {
    const { requests } = await seat.listSeatRequests(service, { status: 'pending', limit: 100 })
    if (!requests.length) return console.log('No open teacher seat requests.')
    console.log(`${requests.length} open request(s), oldest first:\n`)
    for (const r of requests) {
      const days = Math.floor((Date.now() - Date.parse(r.created_at)) / 86_400_000)
      console.log(`  ${r.school_name}`)
      console.log(`    account:  ${r.account_email ?? r.user_id}`)
      console.log(`    school:   ${r.school_email}`)
      if (r.role_title) console.log(`    role:     ${r.role_title}`)
      if (r.class_size) console.log(`    students: ${r.class_size}`)
      if (r.school_country) console.log(`    country:  ${r.school_country}`)
      console.log(`    waiting:  ${days} day(s)`)
      console.log(`    approve:  pnpm teacher:grant --approve ${r.account_email ?? '<email>'}\n`)
    }
    return
  }

  if (target === '--approve' || target === '--decline') {
    const [email, ...reasonParts] = rest
    if (!email) fail(`Usage: pnpm teacher:grant ${target} <email>${target === '--decline' ? ' <reason>' : ' [reason]'}`)
    const userId = await seat.userIdForEmail(service, email)
    if (!userId) fail(`No account found for ${email}. They must sign up first.`)

    const { data: request, error } = await service
      .from('teacher_seat_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!request) {
      fail(`No open request for ${email}. Use "pnpm teacher:grant ${email} \\"<reason>\\"" to grant a seat without one.`)
    }

    // Same validation as the admin page: a decline must carry a reason the
    // teacher can act on, because they are shown it.
    const parsed = seat.parseSeatDecisionBody({
      request_id: request.id,
      action: target === '--approve' ? 'approve' : 'decline',
      reason: reasonParts.join(' '),
    })
    if (!parsed.ok) fail(parsed.error)

    const result = await seat.applySeatDecision(service, parsed.decision, {
      teacherCap: teacherMarkCap(),
      freeCap: capForTier('free'),
    })
    if (!result.ok) fail(result.error)

    console.log(`${result.status === 'approved' ? 'Approved' : 'Declined'} ${email}.`)
    if (!result.emailed) {
      console.warn('  WARNING: the email was not sent (RESEND_API_KEY unset, or the send failed).')
      console.warn('    Tell them by hand — they are waiting on it.')
    }
    return
  }

  const revoke = rest.includes('--revoke')
  const reason = rest
    .filter((a) => a !== '--revoke')
    .join(' ')
    .trim()
  if (!revoke && !reason) {
    fail('A reason is required so the seat list stays auditable, e.g. "outreach: Harrow, Chemistry".')
  }

  const userId = await seat.userIdForEmail(service, target)
  if (!userId) fail(`No account found for ${target}. They must sign up first.`)

  await seat.setTeacherSeat(service, { userId, revoke, reason })
  // A hand-granted seat answers any open request too, or the queue would keep
  // showing a teacher who already has what they asked for.
  if (!revoke) await seat.closeOpenRequest(service, userId, 'approved', reason)

  console.log(revoke ? `Revoked teacher seat for ${target}.` : `Granted teacher seat to ${target} — ${reason}`)
}

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
