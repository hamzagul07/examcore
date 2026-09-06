import { NextRequest } from 'next/server'
import { getPost, getPostByShortId } from '@/lib/community/posts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SHORT_ID_RE = /^[0-9a-f]{8}$/i

/**
 * GET /api/community/posts/[id] — one post by full UUID or the 8-hex short
 * id used in public URLs. Added for the mobile app: its detail screen,
 * search results, and deep links need a post the feed has not primed.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const post = UUID_RE.test(id)
    ? await getPost(id)
    : SHORT_ID_RE.test(id)
      ? await getPostByShortId(id)
      : null
  // Same visibility rule as the feed (listPosts filters status = published).
  if (!post || post.status !== 'published') {
    return Response.json({ error: 'Post not found' }, { status: 404 })
  }
  return Response.json({ post })
}
