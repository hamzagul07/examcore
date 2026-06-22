import { createServiceClient } from '@/lib/supabase-server'

export type SearchHit = {
  id: string
  kind: 'question' | 'note'
  title: string
  href: string
  subjectCode: string
  snippet: string
}

export async function searchCommunity(params: {
  query: string
  subjectCode?: string
  limit?: number
}): Promise<SearchHit[]> {
  const q = params.query.trim()
  if (q.length < 2) return []
  const admin = createServiceClient()
  const limit = params.limit ?? 20
  const tsQuery = q.split(/\s+/).filter(Boolean).join(' & ')

  let questionsQ = admin
    .from('community_questions')
    .select('id, title, body_md, subject_code')
    .eq('status', 'published')
    .textSearch('search_vector', tsQuery, { type: 'plain', config: 'english' })
    .limit(limit)
  let notesQ = admin
    .from('community_notes')
    .select('id, title, content_md, subject_code')
    .eq('status', 'published')
    .textSearch('search_vector', tsQuery, { type: 'plain', config: 'english' })
    .limit(limit)

  if (params.subjectCode) {
    questionsQ = questionsQ.eq('subject_code', params.subjectCode)
    notesQ = notesQ.eq('subject_code', params.subjectCode)
  }

  const [{ data: questions }, { data: notes }] = await Promise.all([questionsQ, notesQ])

  const hits: SearchHit[] = [
    ...(questions ?? []).map((row) => ({
      id: row.id as string,
      kind: 'question' as const,
      title: row.title as string,
      href: `/community/questions/${row.id}`,
      subjectCode: row.subject_code as string,
      snippet: ((row.body_md as string) ?? '').slice(0, 140),
    })),
    ...(notes ?? []).map((row) => ({
      id: row.id as string,
      kind: 'note' as const,
      title: row.title as string,
      href: `/community/notes/${row.id}`,
      subjectCode: row.subject_code as string,
      snippet: ((row.content_md as string) ?? '').slice(0, 140),
    })),
  ]

  return hits.slice(0, limit)
}
