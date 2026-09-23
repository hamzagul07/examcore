/**
 * Grants, pauses or lists creator seats (docs/CREATORS_PROGRAM.md).
 *
 *   pnpm creator:grant --list
 *   pnpm creator:grant maya@example.com MAYA --handle maya --name "Maya K" \
 *        --tagline "IGCSE tips, no fluff" --tiktok @maya.studies --instagram @maya.studies \
 *        --gift 5 --pool 200 --reason "outreach: tiktok 12k" [--adult]
 *   pnpm creator:grant maya@example.com --pause
 *   pnpm creator:grant maya@example.com --resume
 *
 * Seats are granted here and never claimed in the product, for the same
 * reason teacher seats are: the seat carries a marking allowance and a gift
 * budget, and a self-declared field is not evidence. `--adult` is a statement
 * about cash eligibility later on, so set it only from something you have seen.
 */
process.loadEnvFile?.('.env.local')

// Marks the file as a module — see the note in attribution-report.ts.
export {}

type Flags = Record<string, string | true>

function parseArgs(argv: string[]): { positional: string[]; flags: Flags } {
  const positional: string[] = []
  const flags: Flags = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const next = argv[i + 1]
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next
        i += 1
      } else {
        flags[key] = true
      }
    } else {
      positional.push(arg)
    }
  }
  return { positional, flags }
}

function str(flags: Flags, key: string): string | null {
  const v = flags[key]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function int(flags: Flags, key: string, fallback: number): number {
  const v = str(flags, key)
  if (!v) return fallback
  const n = Number.parseInt(v, 10)
  if (!Number.isFinite(n)) throw new Error(`--${key} must be a whole number`)
  return n
}

type Service = ReturnType<(typeof import('../lib/supabase/service'))['createServiceClient']>

/** Paged listUsers: the admin API has no lookup-by-email. */
async function findUserByEmail(service: Service, email: string): Promise<string | null> {
  const wanted = email.trim().toLowerCase()
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const hit = data.users.find((u) => (u.email ?? '').toLowerCase() === wanted)
    if (hit) return hit.id
    if (data.users.length < 200) break
  }
  return null
}

async function listSeats(service: Service) {
  const { data: rows, error } = await service
    .from('creators')
    .select('user_id, code, status, verified_at, verified_reason, gift_marks, gift_pool_monthly')
    .order('verified_at', { ascending: true })
  if (error) throw error
  if (!rows?.length) {
    console.log('No creator seats yet.')
    return
  }
  const { data: profiles } = await service
    .from('user_profiles')
    .select('id, username')
    .in(
      'id',
      rows.map((r) => r.user_id as string)
    )
  const handle = new Map((profiles ?? []).map((p) => [p.id as string, p.username as string | null]))
  for (const r of rows) {
    const h = handle.get(r.user_id as string)
    console.log(
      `${String(r.code).padEnd(12)} ${String(r.status).padEnd(7)} @${h ?? '(no handle)'}`.padEnd(46) +
        ` gift ${r.gift_marks}/${r.gift_pool_monthly}  ${String(r.verified_at).slice(0, 10)}  ${r.verified_reason ?? ''}`
    )
  }
}

async function main() {
  const { createServiceClient } = await import('../lib/supabase/service')
  const { validateCreatorCode } = await import('../lib/creators/codes')
  const { validateUsername } = await import('../lib/community/username')
  const { SITE_URL } = await import('../lib/site-config')
  const service = createServiceClient()

  const { positional, flags } = parseArgs(process.argv.slice(2))

  if (flags.list) {
    await listSeats(service)
    return
  }

  const [email, rawCode] = positional
  if (!email) {
    console.error(
      'Usage: pnpm creator:grant <email> <CODE> [--handle h] [--name n] [--tagline t] [--tiktok @x] [--instagram @x] [--youtube @x] [--gift 5] [--pool 200] [--reason r] [--adult]\n' +
        '       pnpm creator:grant <email> --pause | --resume\n' +
        '       pnpm creator:grant --list'
    )
    process.exit(1)
  }

  const userId = await findUserByEmail(service, email)
  if (!userId) {
    console.error(`No account for ${email}. They need to sign up first.`)
    process.exit(1)
  }

  if (flags.pause || flags.resume) {
    const status = flags.pause ? 'paused' : 'active'
    const { error } = await service
      .from('creators')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
    if (error) throw error
    console.log(`${email}: seat ${status}.`)
    return
  }

  const codeCheck = validateCreatorCode(rawCode)
  if (!codeCheck.ok) {
    console.error(`Code "${rawCode ?? ''}" is not usable: ${codeCheck.reason}. 3–12 letters/digits.`)
    process.exit(1)
  }
  const code = codeCheck.code

  const { data: clash } = await service
    .from('creators')
    .select('user_id')
    .eq('code', code)
    .neq('user_id', userId)
    .maybeSingle()
  if (clash) {
    console.error(`Code ${code} already belongs to another creator.`)
    process.exit(1)
  }

  // The space lives at /with/<username>; make sure there is one.
  const { data: profile } = await service
    .from('user_profiles')
    .select('username, full_name')
    .eq('id', userId)
    .maybeSingle()
  let handle = (profile?.username as string | null) ?? null
  const wantedHandle = str(flags, 'handle')
  if (!handle) {
    if (!wantedHandle) {
      console.error(`${email} has no username yet. Pass --handle <name> to set one.`)
      process.exit(1)
    }
    const check = validateUsername(wantedHandle)
    if (!check.ok) {
      console.error(`--handle "${wantedHandle}" is not a valid username (3–20 of a-z 0-9 _).`)
      process.exit(1)
    }
    const { data: taken } = await service
      .from('user_profiles')
      .select('id')
      .eq('username', check.username)
      .neq('id', userId)
      .maybeSingle()
    if (taken) {
      console.error(`@${check.username} is taken.`)
      process.exit(1)
    }
    const { error } = await service
      .from('user_profiles')
      .upsert(
        { id: userId, username: check.username, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      )
    if (error) throw error
    handle = check.username
  } else if (wantedHandle && wantedHandle !== handle) {
    console.warn(`Keeping existing handle @${handle} (ignored --handle ${wantedHandle}).`)
  }

  const links: Record<string, string> = {}
  for (const key of ['tiktok', 'instagram', 'youtube'] as const) {
    const v = str(flags, key)
    if (v) links[key] = v
  }

  const row = {
    user_id: userId,
    code,
    status: 'active',
    verified_at: new Date().toISOString(),
    verified_reason: str(flags, 'reason') ?? `manual: ${new Date().toISOString().slice(0, 10)}`,
    is_adult: flags.adult === true,
    display_name: str(flags, 'name') ?? (profile?.full_name as string | null) ?? null,
    tagline: str(flags, 'tagline'),
    links,
    gift_marks: int(flags, 'gift', 5),
    gift_pool_monthly: int(flags, 'pool', 200),
    updated_at: new Date().toISOString(),
  }
  const { error } = await service.from('creators').upsert(row, { onConflict: 'user_id' })
  if (error) throw error

  console.log(`Creator seat granted to ${email}`)
  console.log(`  space  ${SITE_URL}/with/${handle}`)
  console.log(`  mark   ${SITE_URL}/mark?code=${code}`)
  console.log(`  code   ${code}  gift ${row.gift_marks} marks, pool ${row.gift_pool_monthly}/month`)
  console.log(`  studio ${SITE_URL}/creator (when they sign in)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
