import { NextRequest, NextResponse } from 'next/server'

import { isCommunityEnabled } from '@/lib/community/enabled'
import { getPost } from '@/lib/community/posts'
import { communityPostHref } from '@/lib/community/post-url'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * The original bare-UUID URL, kept alive as a real redirect.
 *
 * These links sit in shared messages, notification emails and whatever Google
 * has already crawled, so they have to keep resolving — and they have to carry
 * their ranking signals to the readable URL.
 *
 * A route handler rather than a page calling redirect(): a Server Component
 * that redirects mid-stream emits a `<meta http-equiv="refresh">`, which is a
 * soft redirect Google treats far more loosely than a 308. This returns the
 * status code itself, before any rendering begins.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const origin = _request.nextUrl.origin

  if (!isCommunityEnabled()) {
    return NextResponse.redirect(new URL('/community', origin), { status: 308 })
  }

  const post = await getPost(id)
  if (!post || post.status === 'removed') {
    return new NextResponse('Not found', { status: 404 })
  }

  return NextResponse.redirect(new URL(communityPostHref(post), origin), { status: 308 })
}
