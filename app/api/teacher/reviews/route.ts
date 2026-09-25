import { createServiceClient } from '@/lib/supabase/service'
import {
  decodeReviewCursor,
  loadReviewQueue,
  pageReviewItems,
  parseReviewFilters,
  parseReviewLimit,
} from '@/lib/teacher/reviews-query'
import { authorizeTeacher, jsonError, jsonOk, serverError } from '../attempt/_lib/http'

export const dynamic = 'force-dynamic'

/**
 * GET `?classroom_id&student_id&assignment_id&status=pending|confirmed|overridden|flagged&cursor&limit≤50`
 * → `{items: ReviewInboxItem[], next_cursor, counts, truncated, window_days}`.
 *
 * The teacher's review queue (spec §3): highest priority first, then newest,
 * keyset-paginated on that order. `counts` are per status over the other
 * filters, so a status picker can show them. Scope, scoring and names:
 * lib/teacher/reviews-query.ts. A class or set that is not the teacher's is
 * a 404; a malformed filter or cursor is a 400 naming the parameter.
 */
export async function GET(request: Request) {
  const auth = await authorizeTeacher()
  if ('response' in auth) return auth.response

  const params = new URL(request.url).searchParams
  const filters = parseReviewFilters(params)
  if (!filters.ok) return jsonError(400, filters.error, filters.field)

  const rawCursor = params.get('cursor')
  const cursor = rawCursor ? decodeReviewCursor(rawCursor) : null
  if (rawCursor && !cursor) return jsonError(400, 'That page link has expired. Reload the list.', 'cursor')
  const limit = parseReviewLimit(params.get('limit'))

  try {
    const queue = await loadReviewQueue(auth.supabase, createServiceClient(), auth.user.id, filters.value)
    if (!queue.ok) return jsonError(queue.status, queue.error, queue.field)
    const page = pageReviewItems(queue.items, cursor, limit)
    return jsonOk({
      items: page.items,
      next_cursor: page.next_cursor,
      counts: queue.counts,
      truncated: queue.truncated,
      window_days: queue.windowDays,
    })
  } catch (err) {
    return serverError('reviews', { filters: filters.value }, err, 'Could not load the review queue.')
  }
}
