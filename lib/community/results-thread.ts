import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'

/**
 * Flairs that mark a thread as part of the results-week conversation.
 *
 * Ordered by how well the thread answers "I have my grade, now what?" — a
 * boundary thread beats a generic results-day thread because the reader
 * arriving from a threshold page already has a raw mark in hand.
 */
const RESULTS_FLAIRS = ['Grade boundaries', 'Results day', 'Results'] as const

/** Where a reader should land when they click "post in the thread" for a subject. */
export type ThreadTarget = {
  href: string
  /** False when we fell back to a room or the feed because no thread exists yet. */
  exact: boolean
}

function flairRank(flair: string | null): number {
  if (!flair) return RESULTS_FLAIRS.length
  const i = RESULTS_FLAIRS.indexOf(flair as (typeof RESULTS_FLAIRS)[number])
  return i === -1 ? RESULTS_FLAIRS.length : i
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

  const rows = data ?? []
  if (!rows.length) {
    // Nothing to land on. A subject at least has a room where every post is
    // about their syllabus; without one, the feed is all that is left.
    return {
      href: subjectCode ? `/community/s/${subjectCode}` : '/community',
      exact: false,
    }
  }

  const best = [...rows].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
    const byFlair = flairRank(a.flair) - flairRank(b.flair)
    if (byFlair !== 0) return byFlair
    return String(b.created_at).localeCompare(String(a.created_at))
  })[0]

  return { href: `/community/posts/${best.id}`, exact: true }
}
