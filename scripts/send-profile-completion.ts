/**
 * Send the profile-completion nudge for a specific user.
 *
 *   # render only, write nothing, send nothing
 *   pnpm profile:nudge -- --user=<uuid> --dry-run
 *
 *   # send a review copy to yourself, using that user's real profile data
 *   pnpm profile:nudge -- --user=<uuid> --to=you@example.com
 *
 *   # send to the actual subscriber
 *   pnpm profile:nudge -- --user=<uuid> --live
 *
 *   # override the name when the signup name is not what they go by
 *   pnpm profile:nudge -- --user=<uuid> --name="Kunli Cao" --dry-run
 *
 *   # drop the name entirely when it cannot be trusted (addresses by plan)
 *   pnpm profile:nudge -- --user=<uuid> --no-name --dry-run
 *
 * `--live` is the only way to reach the real address, and it refuses to run
 * alongside `--to`. Reviewing a draft and mailing a customer should never be
 * one keystroke apart.
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

/** Subject counts we can state as fact; anything else stays unstated. */
const EXPECTED_SUBJECTS: Record<string, number> = {
  'IB Diploma': 6,
}

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
  const { buildProfileCompletionEmail, sendProfileCompletionEmail } = await import(
    '@/lib/email/profile-completion'
  )

  const admin = createServiceClient()
  const { data: sub } = await admin
    .from('user_subscriptions')
    .select('tier, status')
    .eq('user_id', userId)
    .maybeSingle()

  const { data: profile, error } = await admin
    .from('user_profiles')
    .select('full_name, subjects, level, board, exam_date')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new Error(`profile lookup failed: ${error.message}`)
  if (!profile) {
    console.error(`No profile for ${userId}`)
    process.exit(1)
  }

  const { data: authUser } = await admin.auth.admin.getUserById(userId)
  const realEmail = authUser?.user?.email ?? null

  // OAuth signups land their name in auth metadata and never write it to
  // user_profiles, so reading only the profile silently drops personalisation
  // for exactly the accounts that have a name to use.
  const meta = (authUser?.user?.user_metadata ?? {}) as Record<string, unknown>
  const metaName =
    [meta.full_name, meta.name, meta.given_name].find(
      (v): v is string => typeof v === 'string' && v.trim().length > 0
    ) ?? null
  // --name wins over both. The signup name is whatever the OAuth provider
  // handed us and is not always what the person is actually called; getting a
  // customer's own name wrong is worse than not using one.
  // --no-name suppresses the signup name entirely, for when the provider's
  // name is not trusted to be what the person actually goes by. The email then
  // addresses them by plan instead of guessing.
  const displayName = has('no-name')
    ? null
    : arg('name')?.trim() || (profile.full_name as string | null)?.trim() || metaName

  // Named only while the subscription is actually live — telling a lapsed
  // account it is "on Scholar" is a worse mistake than saying nothing.
  const { tierMarketingName } = await import('@/lib/billing/caps')
  const { ACTIVE_STATUSES } = await import('@/lib/billing/access')
  const planLabel =
    sub?.tier &&
    sub.tier !== 'free' &&
    ACTIVE_STATUSES.includes(sub.status as never)
      ? tierMarketingName(sub.tier as never)
      : null

  // Same assembly the Polar webhook uses, so the hand-sent email and the
  // automatic Day-0 one can never drift apart.
  const { buildScholarVaultPayload } = await import('@/lib/email/scholar-vault-welcome')
  const payload = await buildScholarVaultPayload(
    admin,
    userId,
    reviewTo ?? realEmail ?? '',
    { recipientName: displayName, planLabel }
  )
  if (!payload) {
    console.error(`No profile for ${userId}`)
    process.exit(1)
  }

  const { subject, text } = buildProfileCompletionEmail(payload)

  console.log(`user        ${userId}`)
  console.log(`level       ${payload.level ?? '—'} (${payload.board ?? '—'})`)
  console.log(`subjects    ${payload.subjects?.length ? payload.subjects.join(', ') : '(none)'}`)
  console.log(`exam date   ${payload.hasExamDate ? 'set' : 'MISSING'}`)
  console.log(`real inbox  ${realEmail ?? '(unknown)'}`)
  console.log(`sending to  ${dryRun ? '(nothing — dry run)' : payload.to}`)
  console.log(`\nsubject: ${subject}\n`)
  console.log(text)

  if (dryRun) return
  if (!payload.to) {
    console.error('\nNo destination address resolved.')
    process.exit(1)
  }
  if (!live && !reviewTo) {
    console.error('\nRefusing to mail the subscriber without --live.')
    process.exit(1)
  }

  const ok = await sendProfileCompletionEmail(payload)
  console.log(`\n${ok ? 'sent' : 'FAILED'} → ${payload.to}`)
  if (!ok) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
