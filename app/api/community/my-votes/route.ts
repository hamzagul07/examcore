import { NextRequest } from 'next/server'
import {
  authenticateRouteRequest,
  createServiceClient,
  jsonWithAuthCookies,
} from '@/lib/supabase-server'
import { getUserCommentVotes } from '@/lib/community/comments'
import { getUserPostVotes } from '@/lib/community/posts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_POST_IDS = 100

/**
 * GET /api/community/my-votes — the signed-in viewer's own votes, so
 * clients (the mobile app) can render standing votes instead of guessing
 * neutral. Signed-out callers get empty maps, not an error.
 *
 *   ?posts=<uuid>,<uuid>,...   votes on those posts (max 100)
 *   ?post=<uuid>               votes on every comment of that post
 */
export async function GET(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) return jsonWithAuthCookies({ posts: {}, comments: {} }, pendingCookies)

  const sp = request.nextUrl.searchParams
  const postIds = (sp.get('posts') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => UUID_RE.test(id))
    .slice(0, MAX_POST_IDS)
  const commentsOfPost = sp.get('post')

  const posts = postIds.length ? await getUserPostVotes(user.id, postIds) : {}

  let comments: Record<string, number> = {}
  if (commentsOfPost && UUID_RE.test(commentsOfPost)) {
    const admin = createServiceClient()
    const { data } = await admin
      .from('community_comments')
      .select('id')
      .eq('post_id', commentsOfPost)
    const ids = (data ?? []).map((row) => row.id as string)
    comments = await getUserCommentVotes(user.id, ids)
  }

  return jsonWithAuthCookies({ posts, comments }, pendingCookies)
}
