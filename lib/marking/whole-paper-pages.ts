import type { OcrLine } from '@/lib/examiner-ink-positioning'
import { questionLabelMatch } from './page-detection'

export type StoredPageOcr = {
  photo_url: string
  full_text: string
  ocr_lines: OcrLine[]
  question_label: string | null
}

/**
 * Map a segmented question number to uploaded page indices.
 *
 * Exact label matches first. Failing that, a page labelled with the whole
 * question ("3") answers for any of its parts ("3(a)"), and pages labelled
 * with parts ("3(a)", "3(b)") answer for the whole question ("3"). Sibling
 * parts never match each other. Before this, "3(a)" against a page whose
 * header read "Question 3" matched nothing, so the question was marked with no
 * OCR boxes and shown with no examiner ink.
 */
export function pageIndicesForQuestion(
  questionNumber: string,
  pages: StoredPageOcr[]
): number[] {
  const exact: number[] = []
  const related: number[] = []
  for (let i = 0; i < pages.length; i++) {
    const label = pages[i].question_label
    if (!label) continue
    const match = questionLabelMatch(questionNumber, label)
    if (match === 'exact') exact.push(i)
    else if (match) related.push(i)
  }
  if (exact.length > 0 || related.length > 0) {
    return [...exact, ...related].sort((a, b) => a - b)
  }

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

function normalizeQKey(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, '')
}

/**
 * Segment a paper by its page labels alone: one question per distinct label,
 * its answer being the text of every page carrying that label, in upload
 * order, with unlabelled pages read as continuations of the page before them.
 *
 * This is the fallback for when the model's segmentation was cut off by its
 * output cap. Segmentation echoes every answer's text, so a long paper can
 * overrun the cap and the JSON arrives without its last questions — which
 * `extractJSON` repairs into a shorter, plausible-looking list. Pages are the
 * one thing we know is complete, so a page-range split loses nothing even if
 * it is coarser than the model's. Pages before the first label have no
 * question to belong to and are left out.
 */
export function segmentQuestionsByPageLabels(
  pages: Array<Pick<StoredPageOcr, 'full_text' | 'question_label'>>
): Array<{ question_number: string; answer_text: string }> {
  const groups = new Map<string, { question_number: string; texts: string[] }>()
  let current: string | null = null

  pages.forEach((page, index) => {
    const text = (page.full_text ?? '').trim()
    const label = page.question_label?.trim()
    if (label) {
      const key = normalizeQKey(label)
      if (!groups.has(key)) groups.set(key, { question_number: label, texts: [] })
      current = key
    }
    if (!current || !text) return
    groups.get(current)!.texts.push(`[Page ${index + 1}]\n${text}`)
  })

  return [...groups.values()]
    .filter((g) => g.texts.length > 0)
    .map((g) => ({
      question_number: g.question_number,
      answer_text: g.texts.join('\n\n'),
    }))
}
