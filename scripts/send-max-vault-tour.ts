/**
 * Send the Max Vault tour email (test or one-off).
 *
 *   pnpm exec tsx scripts/send-max-vault-tour.ts
 *   pnpm exec tsx scripts/send-max-vault-tour.ts --to you@example.com --name Hamza
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

async function main() {
  const to = arg('--to') || 'hg9256970@gmail.com'
  const name = arg('--name') || 'Hamza'

  const { isEmailConfigured } = await import('@/lib/email/send')
  if (!isEmailConfigured()) {
    console.error('RESEND_API_KEY missing — set it in .env.local')
    process.exit(1)
  }

  const { sendMaxVaultTourEmail } = await import('@/lib/email/max-vault-tour')
  console.log(`Sending Max Vault tour to ${to} (name: ${name})…`)
  const ok = await sendMaxVaultTourEmail({ to, recipientName: name, wait: true })
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
