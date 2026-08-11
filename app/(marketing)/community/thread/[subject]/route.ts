import { NextRequest, NextResponse, after } from 'next/server'

import { isCommunityEnabled } from '@/lib/community/enabled'
import { findCommunitySubject } from '@/lib/community/subjects'
import { resolveResultsThread } from '@/lib/community/results-thread'
import { recordResultsThreadClick } from '@/lib/community/thread-clicks'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /community/thread/<subject> — send the reader to that subject's live
 * results thread.
 *
 * This exists so the results-week CTAs on the boundary guides, the calculators
 * and the subject hubs can point at "the thread" without knowing which post
 * that is. Resolving at click time rather than at render time means the link
 * follows the conversation as it moves through the week.
 *
 * Any query string on the way in is carried through, so the UTM tags the CTA
 * sets survive the hop.
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

  // Logged here rather than left to the page-view tracker: page_events stores
  // pathname only, so the utm_source the CTA sets is dropped on arrival and
  // there would be no way to tell which page earned the click. Every click
  // passes through this handler, including from readers with no JS.
  after(async () => {
    await recordResultsThreadClick({
      source: request.nextUrl.searchParams.get('utm_source'),
      subject,
      landedOnThread: target.exact,
    })
  })

  // 302, not 308: which thread is "the" thread changes during results week and
  // a permanent redirect would stick in browser caches past its usefulness.
  return NextResponse.redirect(destination, { status: 302 })
}
