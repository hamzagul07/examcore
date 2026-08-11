import { NextRequest, NextResponse } from 'next/server'

import { isCommunityEnabled } from '@/lib/community/enabled'
import { findCommunitySubject } from '@/lib/community/subjects'
import { resolveResultsThread } from '@/lib/community/results-thread'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /community/thread/<subject> — send the reader to that subject's live
 * results thread.
 *
 * This exists so the results-week CTAs can sit on statically generated
 * marketing pages (the boundary guides, the calculators, the subject hubs)
 * and still land on the right thread. Resolving at click time instead of at
 * build time means the link follows the conversation as it moves through the
 * week rather than freezing on whichever thread existed at deploy.
 *
 * Any query string on the way in is carried through, so the UTM tags the CTA
 * sets survive the hop and the source page stays attributable.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ subject: string }> }) {
  const { subject } = await params
  const origin = request.nextUrl.origin

  if (!isCommunityEnabled()) {
    return NextResponse.redirect(new URL('/results-2026', origin), { status: 302 })
  }

  // "results" is the reserved subject-less slug the hub pages use — they have
  // results-week intent but no syllabus in context.
  const anySubject = subject === 'results'
  const known = anySubject || !!findCommunitySubject(subject)
  const target = known
    ? await resolveResultsThread(anySubject ? null : subject)
    : { href: '/community', exact: false }

  const destination = new URL(target.href, origin)
  request.nextUrl.searchParams.forEach((value, key) => {
    destination.searchParams.set(key, value)
  })

  // 302, not 308: which thread is "the" thread changes during results week and
  // a permanent redirect would stick in browser caches past its usefulness.
  return NextResponse.redirect(destination, { status: 302 })
}
