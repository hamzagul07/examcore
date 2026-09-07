import { NextRequest } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { listPosts } from '@/lib/community/posts'

/**
 * GET /api/community/saved — the signed-in user's saved posts, newest-saved
 * first. The save rows are read with the user's own client (owner-only RLS);
 * the posts are fetched by id and re-ordered to match the save order.
 */
export async function GET(request: NextRequest) {
  const { supabase, user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) return jsonWithAuthCookies({ posts: [] }, pendingCookies, { status: 401 })

  const { data: saves } = await supabase
    .from('community_post_saves')
    .select('post_id, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  const ids = (saves ?? []).map((row) => row.post_id as string)
  if (ids.length === 0) return jsonWithAuthCookies({ posts: [] }, pendingCookies)

  const posts = await listPosts({ ids, sort: 'new', limit: 100 })
  // Preserve save order (listPosts returns published-only, any order).
  const order = new Map(ids.map((id, index) => [id, index]))
  posts.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))

  return jsonWithAuthCookies({ posts }, pendingCookies)
}
