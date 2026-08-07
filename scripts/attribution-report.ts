/**
 * Prints where visitors actually came from.
 *
 *   pnpm attribution         # last 30 days
 *   pnpm attribution 7       # last 7 days
 *
 * Only covers sessions recorded after the tracker fix shipped — earlier traffic
 * has no recoverable source and is not backfillable.
 */
// Node's built-in env loader, matching the other scripts in this directory.
// Loaded before the report module so the service client sees the credentials.
process.loadEnvFile?.('.env.local')

// Marks the file as a module. Without a top-level import/export TypeScript
// treats it as a global script, and `main` collides with the other CLIs here.
export {}

async function main() {
  const { channelReport, formatReport } = await import('../lib/analytics/channel-report')

  const days = Number(process.argv[2] ?? 30)
  if (!Number.isFinite(days) || days <= 0) {
    console.error('Usage: pnpm attribution [days]')
    process.exit(1)
  }

  const report = await channelReport(days)
  console.log(formatReport(report))
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
