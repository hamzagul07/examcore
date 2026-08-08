/**
 * Send a broadcast campaign.
 *
 * Dry run unless --live is passed, and --live additionally requires typing the
 * slug back. This is the only script in the repo that mails hundreds of real
 * students in one go; the friction is the point.
 *
 *   pnpm campaign:list
 *   pnpm campaign:send -- --slug=august-update
 *   pnpm campaign:send -- --slug=august-update --live --confirm=august-update
 *
 * Options:
 *   --slug=<slug>      campaign to run (required)
 *   --limit=<n>        max recipients this run (default 50)
 *   --live             actually send
 *   --confirm=<slug>   must equal --slug when --live is set
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
  const { runCampaign } = await import('@/lib/campaigns/send')
  const { SEGMENTS } = await import('@/lib/campaigns/audience')

  if (has('list-segments')) {
    for (const s of Object.values(SEGMENTS)) {
      const n = (await s.resolve()).length
      console.log(`${s.id.padEnd(18)} ${String(n).padStart(4)}  ${s.description}`)
    }
    return
  }

  const slug = arg('slug')
  if (!slug) {
    console.error('Missing --slug=<slug>. Use --list-segments to see audiences.')
    process.exit(1)
  }

  const live = has('live')
  if (live && arg('confirm') !== slug) {
    console.error(
      `Refusing to send live: pass --confirm=${slug} to confirm you mean this campaign.`
    )
    process.exit(1)
  }

  const limit = Number(arg('limit') ?? 50)

  const result = await runCampaign({ slug, live, limit })
  console.log(JSON.stringify(result, null, 2))

  if (result.dry_run) {
    console.log(
      `\nDry run. ${result.attempted} would be sent now, ${result.remaining} would remain.` +
        `\nAdd --live --confirm=${slug} to send.`
    )
  }
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
