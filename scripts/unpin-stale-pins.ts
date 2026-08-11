/**
 * Unpin threads left over from a previous results cycle.
 *
 *   pnpm community:unpin-stale --dry    # list what it would unpin
 *   pnpm community:unpin-stale          # unpin it
 *
 * Pins are sticky and nobody clears them. On the morning the June 2026 tables
 * published, six of the seven pinned slots belonged to seeded June posts — two
 * of them asking what people expected for the **2024** boundaries — sitting
 * above every thread about the results that had just come out. A reader
 * arriving from a 2026 boundary page met a 2024 question first.
 *
 * Only the pin flag changes. Nothing is deleted, the threads stay in the feed
 * and rise or fall on their own merit, and the script prints the ids so the
 * change can be reversed with a single update.
 */
process.loadEnvFile?.('.env.local')

export {}

const DRY = process.argv.includes('--dry')

/** A-Level results morning. Pins older than this belong to a past series. */
const CYCLE_START = '2026-08-11T06:00:00.000Z'

async function main() {
  const { createClient } = await import('@supabase/supabase-js')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
    process.exit(1)
  }
  const db = createClient(url, key, { auth: { persistSession: false } })

  const { data: stale, error } = await db
    .from('community_posts')
    .select('id, title, created_at')
    .eq('status', 'published')
    .eq('is_pinned', true)
    .lt('created_at', CYCLE_START)
    .order('created_at')
  if (error) throw error

  if (!stale?.length) {
    console.log('No stale pins — every pinned thread belongs to this cycle.')
    return
  }

  for (const p of stale) {
    console.log(`• ${DRY ? 'would unpin' : 'unpinned  '}  ${String(p.created_at).slice(0, 10)}  ${p.title.slice(0, 56)}`)
  }

  if (DRY) {
    console.log(`\n[dry] ${stale.length} would be unpinned.`)
    return
  }

  const ids = stale.map((p) => p.id)
  const { error: updateError } = await db
    .from('community_posts')
    .update({ is_pinned: false })
    .in('id', ids)
  if (updateError) throw updateError

  console.log(`\n${stale.length} unpinned. Nothing was deleted — they remain in the feed.`)
  console.log('To put them back exactly as they were:')
  console.log(`  update community_posts set is_pinned = true where id in (${ids.map((i) => `'${i}'`).join(', ')});`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
