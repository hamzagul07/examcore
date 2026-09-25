import { NextRequest } from 'next/server'
import { jsonWithAuthCookies, authenticateRouteRequest } from '@/lib/supabase-server'
import { MAX_SEARCH_QUERY_LENGTH, searchCommunity } from '@/lib/community/search'

/** GET /api/community/search?q=...&subject=9702 */
export async function GET(request: NextRequest) {
  const { pendingCookies } = await authenticateRouteRequest(request)
  const q = (request.nextUrl.searchParams.get('q') ?? '').slice(0, MAX_SEARCH_QUERY_LENGTH)
  const subjectCode = request.nextUrl.searchParams.get('subject') ?? undefined
  const hits = await searchCommunity({ query: q, subjectCode, limit: 30 })
  return jsonWithAuthCookies({ hits }, pendingCookies)
}
