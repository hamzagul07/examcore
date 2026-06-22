import { createServiceClient } from '@/lib/supabase-server'

export type SearchHit = {
  id: string
  kind: 'discussion' | 'question' | 'resource'
  title: string
  href: string
  subjectCode: string
  score: number
  commentCount: number
  snippet: string
}

/** Full-text search over community posts (title weighted above body). */
export async function searchCommunity(params: {
  query: string
  subjectCode?: string
  limit?: number
}): Promise<SearchHit[]> {
  const q = params.query.trim()
  if (q.length < 2) return []
  const admin = createServiceClient()
  const limit = params.limit ?? 25
  const tsQuery = q.split(/\s+/).filter(Boolean).join(' & ')

  let query = admin
    .from('community_posts')
    .select('id, kind, title, body_md, subject_code, score, comment_count')
    .eq('status', 'published')
    .textSearch('search_vector', tsQuery, { type: 'plain', config: 'english' })
    .order('score', { ascending: false })
    .limit(limit)

  if (params.subjectCode) query = query.eq('subject_code', params.subjectCode)

  const { data } = await query
  return (data ?? []).map((row) => ({
    id: row.id as string,
    kind: row.kind as SearchHit['kind'],
    title: row.title as string,
    href: `/community/posts/${row.id}`,
    subjectCode: row.subject_code as string,
    score: (row.score as number) ?? 0,
    commentCount: (row.comment_count as number) ?? 0,
    snippet: ((row.body_md as string) ?? '').replace(/[#>*_`~$]/g, '').slice(0, 140),
  }))
}
