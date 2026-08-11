/**
 * Did the results-week funnel work?
 *
 *   pnpm community:funnel        # last 7 days
 *   pnpm community:funnel 30     # last 30 days
 *
 * Clicks are counted from the synthetic /__cta rows the thread redirect writes.
 * page_events stores pathname only, so the CTA's utm_source never reaches the
 * landing page — anything before that logging shipped is not recoverable.
 */
process.loadEnvFile?.('.env.local')

// Marks the file as a module, so `main` does not collide with the other CLIs
// in this directory.
export {}

async function main() {
  const { communityFunnelReport, formatFunnelReport } = await import('../lib/community/funnel-report')

  const days = Number(process.argv[2] ?? 7)
  if (!Number.isFinite(days) || days <= 0) {
    console.error('Usage: pnpm community:funnel [days]')
    process.exit(1)
  }

  console.log(formatFunnelReport(await communityFunnelReport(days)))
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
