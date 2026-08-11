import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'
import { A_LEVEL_RESULTS_UTC } from '@/lib/seo/results-day'
import { pickResultsThread, RESULTS_FLAIRS } from '@/lib/community/results-thread-rank'

/** Where a reader should land when they click "post in the thread" for a subject. */
export type ThreadTarget = {
  href: string
  /** False when we fell back to a room or the feed because no thread exists yet. */
  exact: boolean
}

function fallback(subjectCode: string | null): ThreadTarget {
  // A subject at least has a room where every post is about their syllabus;
  // without one, the feed is all that is left.
  return {
    href: subjectCode ? `/community/s/${subjectCode}` : '/community',
    exact: false,
  }
}

/**
 * Resolve the live results thread for a subject.
 *
 * Looked up at request time rather than baked into the marketing pages: the
 * threads rotate through results week (boundaries land, then remarks, then
 * resits) and a statically-built link would keep pointing at last week's
 * conversation. Marketing pages link at /community/thread/<subject> and this
 * decides where that actually goes.
 */
export async function resolveResultsThread(subjectCode: string | null): Promise<ThreadTarget> {
  const admin = createServiceClient()
  let query = admin
    .from('community_posts')
    .select('id, flair, is_pinned, created_at')
    .eq('status', 'published')
    .in('flair', RESULTS_FLAIRS as unknown as string[])

  // No subject means a hub page (the boundaries guide, the bare calculator).
  // Those readers still came for results week, so they get the pinned
  // cross-subject thread rather than the mixed feed.
  if (subjectCode) query = query.eq('subject_code', subjectCode)

  const { data } = await query.order('created_at', { ascending: false }).limit(10)

  const best = pickResultsThread(data ?? [], A_LEVEL_RESULTS_UTC)
  if (!best) return fallback(subjectCode)

  return { href: `/community/posts/${best.id}`, exact: true }
}
