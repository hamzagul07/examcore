import { NextRequest, NextResponse, after } from 'next/server'

import { isCommunityEnabled } from '@/lib/community/enabled'
import { findCommunitySubject } from '@/lib/community/subjects'
import { getGradeBoundaryCalculatorCodes } from '@/lib/seo/programmatic-subjects'
import { resolveSubjectThread } from '@/lib/community/results-thread'
import { recordResultsThreadClick, isLikelyBot } from '@/lib/community/thread-clicks'

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
  // A syllabus counts as known if it has a community room OR a boundary page.
  // IGCSE codes have the second and not the first — the course catalog the
  // rooms are built from is A-Level — so without this every reader arriving
  // from an IGCSE boundary post lands on the mixed feed, which is exactly the
  // dead end the CTA was built to remove. Matched against the fixed code list
  // rather than by probing the data directory, so a hand-edited URL cannot
  // steer a filesystem read.
  const known =
    anySubject ||
    !!findCommunitySubject(subject) ||
    // Base IB slugs — the blog says `chemistry`, the rooms are `chemistry-hl`.
    !!findCommunitySubject(`${subject}-hl`) ||
    !!findCommunitySubject(`${subject}-sl`) ||
    getGradeBoundaryCalculatorCodes().includes(subject)
  const target = known
    ? await resolveSubjectThread(anySubject ? null : subject)
    : { href: '/community', exact: false }

  const destination = new URL(target.href, origin)
  request.nextUrl.searchParams.forEach((value, key) => {
    destination.searchParams.set(key, value)
  })

  // Logged here rather than left to the page-view tracker: page_events stores
  // pathname only, so the utm_source the CTA sets is dropped on arrival and
  // there would be no way to tell which page earned the click. Every click
  // passes through this handler, including from readers with no JS.
  // Bots still follow the link even with the header above — that only stops
  // indexing, not fetching — so keep them out of the numbers at the source.
  if (!isLikelyBot(request.headers.get('user-agent'))) {
    after(async () => {
      await recordResultsThreadClick({
        source: request.nextUrl.searchParams.get('utm_source'),
        subject,
        landedOnThread: target.exact,
      })
    })
  }

  // 302, not 308: which thread is "the" thread changes during results week and
  // a permanent redirect would stick in browser caches past its usefulness.
  const response = NextResponse.redirect(destination, { status: 302 })
  // This hop is a piece of instrumentation, not a page. Crawlers reaching it
  // from the CTA on indexed marketing pages would spend crawl budget on
  // redirects and, worse, land in the click log as readers who never existed.
  response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return response
}
