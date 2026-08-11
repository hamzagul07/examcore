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

  const payload = {
    to: reviewTo ?? realEmail ?? '',
    recipientName: profile.full_name as string | null,
    subjects: (profile.subjects as string[] | null) ?? [],
    level: (profile.level as string | null) ?? null,
    board: (profile.board as string | null) ?? null,
    hasExamDate: Boolean(profile.exam_date),
    expectedSubjects: EXPECTED_SUBJECTS[String(profile.level ?? '')] ?? null,
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
