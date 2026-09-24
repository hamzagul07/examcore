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
 * Same code path as the approve button in /admin/creators (lib/creators/grant.ts).
 * Seats are granted, never claimed in the product: the seat carries a marking
 * allowance and a gift budget, and a self-declared field is not evidence.
 * `--adult` is a statement about cash eligibility later on; set it only from
 * something you have seen.
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

function int(flags: Flags, key: string): number | undefined {
  const v = str(flags, key)
  if (!v) return undefined
  const n = Number.parseInt(v, 10)
  if (!Number.isFinite(n)) throw new Error(`--${key} must be a whole number`)
  return n
}

async function main() {
  const { createServiceClient } = await import('../lib/supabase/service')
  const { grantCreatorSeat, findUserIdByEmail } = await import('../lib/creators/grant')
  const { SITE_URL } = await import('../lib/site-config')
  const service = createServiceClient()

  const { positional, flags } = parseArgs(process.argv.slice(2))

  if (flags.list) {
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

  const userId = await findUserIdByEmail(email)
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

  if (!rawCode) {
    console.error('Pass the code: pnpm creator:grant <email> <CODE> ...')
    process.exit(1)
  }

  const result = await grantCreatorSeat({
    userId,
    code: rawCode,
    handle: str(flags, 'handle'),
    displayName: str(flags, 'name'),
    tagline: str(flags, 'tagline'),
    links: {
      tiktok: str(flags, 'tiktok'),
      instagram: str(flags, 'instagram'),
      youtube: str(flags, 'youtube'),
    },
    isAdult: flags.adult === true,
    giftMarks: int(flags, 'gift'),
    giftPoolMonthly: int(flags, 'pool'),
    reason: str(flags, 'reason'),
  })
  if (!result.ok) {
    console.error(result.error)
    process.exit(1)
  }

  console.log(`Creator seat granted to ${email}`)
  console.log(`  space  ${SITE_URL}/with/${result.handle}`)
  console.log(`  mark   ${SITE_URL}/mark?code=${result.code}`)
  console.log(`  studio ${SITE_URL}/creator (when they sign in)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
