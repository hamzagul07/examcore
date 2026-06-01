import type { QuestionMarkResult, WholePaperResult } from '@/lib/marking/types'

export const ANSWER_PHOTOS_BUCKET = 'answer-photos'

const PUBLIC_PATH_MARKER = '/storage/v1/object/public/answer-photos/'

/** Normalize a legacy public URL or signed URL back to a storage path. */
export function toAnswerPhotoStoragePath(stored: string): string {
  const decoded = decodeURIComponent(stored.trim())
  const publicIdx = decoded.indexOf(PUBLIC_PATH_MARKER)
  if (publicIdx !== -1) {
    return decoded.slice(publicIdx + PUBLIC_PATH_MARKER.length).split('?')[0]
  }
  const signIdx = decoded.indexOf(`/object/sign/${ANSWER_PHOTOS_BUCKET}/`)
  if (signIdx !== -1) {
    return decoded.slice(signIdx + `/object/sign/${ANSWER_PHOTOS_BUCKET}/`.length).split('?')[0]
  }
  return decoded
}

export function isAnswerPhotoStoragePath(stored: string): boolean {
  return !stored.startsWith('http://') && !stored.startsWith('https://')
}

export function normalizePhotoRef(stored: string): string {
  if (!stored) return stored
  return isAnswerPhotoStoragePath(stored)
    ? stored
    : toAnswerPhotoStoragePath(stored)
}

function pushPhotoRef(refs: Set<string>, value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return
  refs.add(normalizePhotoRef(value))
}

function collectFromQuestion(refs: Set<string>, question: QuestionMarkResult) {
  pushPhotoRef(refs, question.answer_photo_url)
  if (Array.isArray(question.page_photo_urls)) {
    for (const url of question.page_photo_urls) pushPhotoRef(refs, url)
  }
  if (Array.isArray(question.ink_pages)) {
    for (const page of question.ink_pages) pushPhotoRef(refs, page.photo_url)
  }
}

/** All storage paths / URLs associated with an attempt's answer photos. */
export function collectAttemptPhotoRefs(attempt: {
  answer_photo_url: string | null
  ai_marking: unknown
}): Set<string> {
  const refs = new Set<string>()
  pushPhotoRef(refs, attempt.answer_photo_url)

  const marking = attempt.ai_marking
  if (!marking || typeof marking !== 'object') return refs

  const m = marking as Record<string, unknown>

  if (Array.isArray(m.page_photo_urls)) {
    for (const url of m.page_photo_urls) pushPhotoRef(refs, url)
  }
  if (Array.isArray(m.pages_ocr)) {
    for (const page of m.pages_ocr) {
      if (page && typeof page === 'object') {
        pushPhotoRef(refs, (page as { photo_url?: string }).photo_url)
      }
    }
  }
  if (Array.isArray(m.partial_questions)) {
    for (const q of m.partial_questions) {
      if (q && typeof q === 'object') {
        collectFromQuestion(refs, q as QuestionMarkResult)
      }
    }
  }
  if (m.upload_mode === 'whole_paper' && Array.isArray(m.questions)) {
    for (const q of m.questions) {
      if (q && typeof q === 'object') {
        collectFromQuestion(refs, q as QuestionMarkResult)
      }
    }
  }
  if (m.result && typeof m.result === 'object') {
    const result = m.result as WholePaperResult
    if (Array.isArray(result.questions)) {
      for (const q of result.questions) collectFromQuestion(refs, q)
    }
    if (Array.isArray(result.pages_ocr)) {
      for (const page of result.pages_ocr) pushPhotoRef(refs, page.photo_url)
    }
  }

  return refs
}
