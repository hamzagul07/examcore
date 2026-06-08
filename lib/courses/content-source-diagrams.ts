import type { SupabaseClient } from '@supabase/supabase-js'
import type { WorkedExampleDiagram } from '@/lib/courses/types'

export async function fetchDiagramsByQuestionIds(
  supabase: SupabaseClient,
  questionIds: string[]
): Promise<Map<string, WorkedExampleDiagram[]>> {
  const result = new Map<string, WorkedExampleDiagram[]>()
  if (!questionIds.length) return result

  const { data, error } = await supabase
    .from('extracted_diagrams')
    .select('id, question_id, image_public_url, ai_description, caption, order_in_question')
    .in('question_id', questionIds)
    .order('order_in_question')

  if (error) {
    throw new Error(`Failed to load extracted_diagrams: ${error.message}`)
  }

  for (const row of data ?? []) {
    const qid = row.question_id as string
    const list = result.get(qid) ?? []
    list.push({
      id: row.id as string,
      src: row.image_public_url as string,
      alt: (row.ai_description as string | null) || (row.caption as string | null) || 'Diagram',
      order: Number(row.order_in_question),
    })
    result.set(qid, list)
  }

  return result
}
