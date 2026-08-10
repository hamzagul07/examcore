/**
 * Send the Max Vault tour email (test or one-off).
 *
 *   pnpm email:max-vault-tour
 *   pnpm email:max-vault-tour -- --to you@example.com --name Hamza
 *   pnpm email:max-vault-tour -- --to you@example.com --subjects "Mathematics,Physics"
 *
 * When Supabase env is present, looks up the recipient profile for name / subjects.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq <= 0) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal()

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  if (i < 0) return undefined
  return process.argv[i + 1]
}

async function loadProfileByEmail(email: string): Promise<{
  full_name: string | null
  subjects: string[] | null
  board: string | null
  level: string | null
  target_grade: string | null
} | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) return null

  const { createClient } = await import('@supabase/supabase-js')
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: listed, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })
  if (listErr) {
    console.warn('auth.listUsers failed:', listErr.message)
    return null
  }

  const user = listed.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  )
  if (!user) {
    // Fallback: paginate a bit further for small accounts.
    for (let page = 2; page <= 5; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 })
      const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
      if (hit) {
        const { data: profile } = await admin
          .from('user_profiles')
          .select('full_name, subjects, board, level, target_grade')
          .eq('id', hit.id)
          .maybeSingle()
        return profile
          ? {
              full_name: profile.full_name ?? null,
              subjects: (profile.subjects as string[] | null) ?? null,
              board: profile.board ?? null,
              level: profile.level ?? null,
              target_grade: profile.target_grade ?? null,
            }
          : null
      }
    }
    return null
  }

  const { data: profile } = await admin
    .from('user_profiles')
    .select('full_name, subjects, board, level, target_grade')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) return null
  return {
    full_name: profile.full_name ?? null,
    subjects: (profile.subjects as string[] | null) ?? null,
    board: profile.board ?? null,
    level: profile.level ?? null,
    target_grade: profile.target_grade ?? null,
  }
}

async function main() {
  const to = arg('--to') || 'hg9256970@gmail.com'
  const nameFlag = arg('--name')
  const subjectsFlag = arg('--subjects')
  const targetFlag = arg('--target')

  const { isEmailConfigured } = await import('@/lib/email/send')
  if (!isEmailConfigured()) {
    console.error('RESEND_API_KEY missing — set it in .env.local')
    process.exit(1)
  }

  console.log(`Looking up profile for ${to}…`)
  const profile = await loadProfileByEmail(to)
  if (profile) {
    console.log('Found profile:', {
      name: profile.full_name,
      subjects: profile.subjects,
      board: profile.board,
      level: profile.level,
      target: profile.target_grade,
    })
  } else {
    console.log('No profile found — using flags / defaults.')
  }

  const name =
    nameFlag ||
    profile?.full_name?.trim()?.split(/\s+/)[0] ||
    'Hamza'
  const subjects =
    subjectsFlag
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ||
    profile?.subjects ||
    ['Mathematics', 'Physics', 'Chemistry']

  const { sendMaxVaultTourEmail } = await import('@/lib/email/max-vault-tour')
  console.log(`Sending Max Vault tour to ${to} (name: ${name})…`)
  const ok = await sendMaxVaultTourEmail({
    to,
    recipientName: name,
    subjects,
    board: profile?.board ?? 'Cambridge International',
    level: profile?.level ?? 'A-Level',
    targetGrade: targetFlag || profile?.target_grade || 'A*',
    wait: true,
  })
  if (!ok) {
    console.error('Send failed — check Resend logs / from-address.')
    process.exit(1)
  }
  console.log('Sent. Check inbox (and spam) for:', to)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
