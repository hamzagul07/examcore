import type { OcrLine } from '@/lib/examiner-ink-positioning'

export type StoredPageOcr = {
  photo_url: string
  full_text: string
  ocr_lines: OcrLine[]
  question_label: string | null
}

function normalizeQKey(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, '')
}

/** Map segmented question numbers to uploaded page indices. */
export function pageIndicesForQuestion(
  questionNumber: string,
  pages: StoredPageOcr[]
): number[] {
  const target = normalizeQKey(questionNumber)
  const indices: number[] = []
  for (let i = 0; i < pages.length; i++) {
    const label = pages[i].question_label
    if (label && normalizeQKey(label) === target) indices.push(i)
  }
  if (indices.length > 0) return indices

  // Fallback: if only one page total, attach it
  if (pages.length === 1) return [0]
  return []
}

export function pagesForQuestion(
  questionNumber: string,
  pages: StoredPageOcr[]
): StoredPageOcr[] {
  return pageIndicesForQuestion(questionNumber, pages).map((i) => pages[i])
}

export function enrichSegmentsWithPages(
  questions: Array<{ question_number: string; answer_text: string }>,
  pages: StoredPageOcr[]
): Array<{
  question_number: string
  answer_text: string
  page_indices: number[]
}> {
  return questions.map((q) => ({
    ...q,
    page_indices: pageIndicesForQuestion(q.question_number, pages),
  }))
}
