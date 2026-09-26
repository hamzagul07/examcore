import type { PostgrestError } from '@supabase/supabase-js'
import { jsonWithAuthCookies, type SupabaseAuthCookie } from '@/lib/supabase-server'

/**
 * Row shapes returned by the `vote_post` / `vote_comment` RPCs
 * (supabase/migrations/20260925_community_votes_rpc.sql). Column names are
 * deliberately not the table's own (`value`, `score`, `author_id`) — inside a
 * plpgsql `returns table` those would shadow the columns the body queries.
 */
export type VotePostRow = {
  new_value: number
  post_score: number | null
  post_author: string
  post_subject: string | null
  was_upvote: boolean
}

export type VoteCommentRow = {
  new_value: number
  comment_score: number | null
  comment_author: string
  parent_post: string
  post_subject: string | null
  was_upvote: boolean
}

/**
 * Map the RPC's SQLSTATE to the status the old three-step route produced.
 * The functions raise with fixed codes so this never has to parse a message.
 */
export function voteErrorResponse(
  error: PostgrestError | null,
  pendingCookies: SupabaseAuthCookie[]
): Response {
  const code = error?.code
  if (code === 'P0002') {
    return jsonWithAuthCookies({ error: 'Not found.' }, pendingCookies, { status: 404 })
  }
  if (code === '42501') {
    return jsonWithAuthCookies({ error: 'Sign in to vote.' }, pendingCookies, { status: 401 })
  }
  if (code === '22023') {
    return jsonWithAuthCookies({ error: 'Invalid vote.' }, pendingCookies, { status: 400 })
  }
  console.error('[community/vote] rpc failed:', error)
  return jsonWithAuthCookies({ error: 'Could not record your vote.' }, pendingCookies, { status: 500 })
}
