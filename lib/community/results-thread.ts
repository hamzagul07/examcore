import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'
import { A_LEVEL_RESULTS_UTC } from '@/lib/seo/results-day'
import { pickResultsThread, RESULTS_FLAIRS } from '@/lib/community/results-thread-rank'
import { communityPostHref } from '@/lib/community/post-url'

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
/**
 * The best live thread for a subject, whatever kind it is.
 *
 * Results first while a results cycle is running, because that is what the
 * reader arriving from a boundary page came for. Otherwise the IA thread, which
 * is what an IB student reading an IA-ideas guide in August wants. The room is
 * the fallback and the feed is the last resort.
 *
 * Handles a base slug too: the IB blog frontmatter says `chemistry` while the
 * threads live at `chemistry-hl` and `chemistry-sl`, and sending a reader to the
 * feed over a suffix would be a silly way to lose them.
 */
export async function resolveSubjectThread(subjectCode: string | null): Promise<ThreadTarget> {
  const results = await resolveResultsThread(subjectCode)
  if (results.exact || !subjectCode) return results

  const admin = createServiceClient()
  const { data } = await admin
    .from('community_posts')
    .select('id, subject_code, title, created_at')
    .eq('status', 'published')
    .eq('flair', 'IA')
    .or(`subject_code.eq.${subjectCode},subject_code.eq.${subjectCode}-hl,subject_code.eq.${subjectCode}-sl`)
    .order('created_at', { ascending: false })
    .limit(1)

  const thread = (data ?? [])[0]
  if (!thread) return results

  return {
    href: communityPostHref({
      id: thread.id as string,
      subjectCode: thread.subject_code as string,
      title: thread.title as string,
    }),
    exact: true,
  }
}

export async function resolveResultsThread(subjectCode: string | null): Promise<ThreadTarget> {
  const admin = createServiceClient()
  let query = admin
    .from('community_posts')
    .select('id, flair, is_pinned, created_at, subject_code, title')
    .eq('status', 'published')
    .in('flair', RESULTS_FLAIRS as unknown as string[])

  // No subject means a hub page (the boundaries guide, the bare calculator).
  // Those readers still came for results week, so they get the pinned
  // cross-subject thread rather than the mixed feed.
  if (subjectCode) query = query.eq('subject_code', subjectCode)

  const { data } = await query.order('created_at', { ascending: false }).limit(10)

  const best = pickResultsThread(data ?? [], A_LEVEL_RESULTS_UTC)
  if (!best) return fallback(subjectCode)

  return {
    href: communityPostHref({
      id: best.id,
      subjectCode: best.subject_code ?? '',
      title: best.title ?? '',
    }),
    exact: true,
  }
}
