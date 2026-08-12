/**
 * Nudge a paying subscriber who has never marked anything.
 *
 *   pnpm activation:nudge -- --user=<uuid> --dry-run
 *   pnpm activation:nudge -- --user=<uuid> --to=you@example.com
 *   pnpm activation:nudge -- --user=<uuid> --live
 *   pnpm activation:nudge -- --user=<uuid> --name="Toney" --live
 *
 * Refuses to mail the real address without --live, and refuses --live with
 * --to. It also refuses to send to anyone who has already marked — the whole
 * premise of the email is that they have not.
 */
import { readFileSync } from 'node:fs'

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '').trim()
}

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : undefined
}
const has = (name: string) => process.argv.includes(`--${name}`)

async function main() {
  const userId = arg('user')
  if (!userId) {
    console.error('Missing --user=<uuid>')
    process.exit(1)
  }

  const reviewTo = arg('to')
  const live = has('live')
  const dryRun = has('dry-run')
  if (live && reviewTo) {
    console.error('Refusing to run: --live and --to together is ambiguous. Pick one.')
    process.exit(1)
  }

  const { createServiceClient } = await import('@/lib/supabase-server')
  const { buildPaidActivationEmail, sendPaidActivationNudge } = await import(
    '@/lib/email/paid-activation-nudge'
  )
  const { tierMarketingName } = await import('@/lib/billing/caps')

  const admin = createServiceClient()

  const { count: attempts } = await admin
    .from('attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  const { data: sub } = await admin
    .from('user_subscriptions')
    .select('tier, status')
    .eq('user_id', userId)
    .maybeSingle()

  const { data: profile } = await admin
    .from('user_profiles')
    .select('subjects, level')
    .eq('id', userId)
    .maybeSingle()

  const { data: authUser } = await admin.auth.admin.getUserById(userId)
  const realEmail = authUser?.user?.email ?? null

  // --name wins; otherwise address them by plan rather than by a signup name
  // we may not be able to trust.
  const address =
    arg('name')?.trim() ||
    (sub?.tier && sub.tier !== 'free' ? tierMarketingName(sub.tier as never) : null)
  const level = (profile?.level as string | null) ?? null

  const { subject, text } = buildPaidActivationEmail({
    to: reviewTo ?? realEmail ?? '',
    address,
    subjectCount: ((profile?.subjects as string[] | null) ?? []).length,
    expectedSubjects: level === 'IB Diploma' ? 6 : null,
    levelLabel: level,
  })

  console.log(`user        ${userId}`)
  console.log(`plan        ${sub?.tier ?? '—'} (${sub?.status ?? '—'})`)
  console.log(`attempts    ${attempts ?? 0}`)
  console.log(`subjects    ${((profile?.subjects as string[] | null) ?? []).length}`)
  console.log(`real inbox  ${realEmail ?? '(unknown)'}`)
  console.log(`sending to  ${dryRun ? '(nothing — dry run)' : (reviewTo ?? realEmail)}`)
  console.log(`\nsubject: ${subject}\n`)
  console.log(text)

  if (dryRun) return

  // The email says "you have not marked anything yet". If that stopped being
  // true between writing and sending, it must not go out.
  if ((attempts ?? 0) > 0) {
    console.error(`\nRefusing: this user has ${attempts} attempts — the email would be wrong.`)
    process.exit(1)
  }
  if (!live && !reviewTo) {
    console.error('\nRefusing to mail the subscriber without --live.')
    process.exit(1)
  }

  const ok = await sendPaidActivationNudge(admin, userId, {
    to: reviewTo ?? undefined,
    address,
  })
  console.log(`\n${ok ? 'sent' : 'FAILED'} → ${reviewTo ?? realEmail}`)
  if (!ok) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
