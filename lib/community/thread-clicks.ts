import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'

/** Prefix for results-thread CTA clicks, mirroring `/__funnel/<event>/<board>`. */
export const THREAD_CLICK_PREFIX = '/__cta/results-thread'

/**
 * Crude but sufficient: the point is to keep obvious crawlers out of a metric
 * a person will act on, not to win an arms race. A missing user-agent counts as
 * a bot — every real browser sends one.
 */
const BOT_UA = /bot|crawler|spider|crawling|slurp|bingpreview|headless|lighthouse|curl|wget|python-requests|axios|node-fetch/i

export function isLikelyBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true
  return BOT_UA.test(userAgent)
}

/** Keeps a hand-typed utm_source from becoming an unbounded path segment. */
function segment(raw: string | null | undefined, fallback: string): string {
  const clean = (raw ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 40)
  return clean || fallback
}

/**
 * Record which page earned a click through to a results thread.
 *
 * page_events stores `usePathname()`, which drops the query string, so the
 * CTA's utm_source never survives to the landing page — without this there is
 * no way to tell whether the boundary guide or the calculator is doing the
 * work. Written as a synthetic `/__cta/...` path so it sits alongside the
 * existing `/__funnel/...` rows and needs no new table.
 *
 * Best-effort: a failed insert must never cost the reader their redirect.
 */
export async function recordResultsThreadClick(input: {
  source: string | null
  subject: string
  /** False when we fell back to a room or the feed — worth separating out. */
  landedOnThread: boolean
}): Promise<void> {
  try {
    const admin = createServiceClient()
    const source = segment(input.source, 'unknown')
    const subject = segment(input.subject, 'unknown')
    await admin.from('page_events').insert({
      path: `${THREAD_CLICK_PREFIX}/${source}/${subject}`,
      // The column is nominally a referrer; here it carries the one fact that
      // does not belong in the path — whether the click reached a real thread.
      referrer: input.landedOnThread ? 'thread' : 'fallback',
    })
  } catch (err) {
    console.error('[community/thread-clicks] insert failed:', err)
  }
}
