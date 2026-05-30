import type { PaperQuestionMeta } from './whole-paper'
import { sortQuestionNumbers } from './page-detection'

export type PaperQuestionsDeps = {
  listSchemes: (
    paperCode: string,
    paperSession: string
  ) => Promise<Array<{ question_number: string; total_marks: number }>>
}

export async function fetchPaperQuestionMeta(
  paperCode: string,
  paperSession: string,
  deps: PaperQuestionsDeps
): Promise<PaperQuestionMeta[]> {
  const rows = await deps.listSchemes(paperCode, paperSession)
  const sorted = sortQuestionNumbers(rows.map((r) => r.question_number))
  return sorted.map((question_number) => {
    const row = rows.find((r) => r.question_number === question_number)!
    return {
      question_number,
      total_marks: row.total_marks,
    }
  })
}
