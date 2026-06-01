import { createServiceClient } from '@/lib/supabase/service'
import type { QuestionMarkResult, WholePaperResult } from '@/lib/marking/types'
import {
  ANSWER_PHOTOS_BUCKET,
  isAnswerPhotoStoragePath,
  toAnswerPhotoStoragePath,
} from '@/lib/storage/answer-photo-paths'

export {
  ANSWER_PHOTOS_BUCKET,
  collectAttemptPhotoRefs,
  isAnswerPhotoStoragePath,
  normalizePhotoRef,
  toAnswerPhotoStoragePath,
} from '@/lib/storage/answer-photo-paths'

/** Default signed URL lifetime (1 hour). */
const DEFAULT_TTL_SEC = 60 * 60

export async function uploadAnswerPhoto(
  buffer: Buffer,
  mimeType: string,
  userId: string | null
): Promise<string | null> {
  try {
    const admin = createServiceClient()
    const ext = (mimeType.split('/')[1] || 'jpg').toLowerCase()
    const prefix = userId || 'anon'
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error: uploadError } = await admin.storage
      .from(ANSWER_PHOTOS_BUCKET)
      .upload(path, buffer, {
        contentType: mimeType || 'image/jpeg',
        upsert: false,
      })
    if (uploadError) {
      console.error('answer-photos upload error:', uploadError)
      return null
    }
    return path
  } catch (err) {
    console.error('uploadAnswerPhoto unexpected error:', err)
    return null
  }
}

export async function signAnswerPhotoUrl(
  stored: string | null | undefined,
  expiresIn = DEFAULT_TTL_SEC
): Promise<string | null> {
  if (!stored) return null

  const path = isAnswerPhotoStoragePath(stored)
    ? stored
    : toAnswerPhotoStoragePath(stored)

  const admin = createServiceClient()
  const { data, error } = await admin.storage
    .from(ANSWER_PHOTOS_BUCKET)
    .createSignedUrl(path, expiresIn)

  if (error || !data?.signedUrl) {
    console.error('answer-photos sign error:', error)
    return null
  }
  return data.signedUrl
}

export async function signAnswerPhotoUrls(
  stored: string[] | null | undefined,
  expiresIn = DEFAULT_TTL_SEC
): Promise<string[] | undefined> {
  if (!stored?.length) return stored ?? undefined
  const signed = await Promise.all(stored.map((s) => signAnswerPhotoUrl(s, expiresIn)))
  return signed.filter((u): u is string => !!u)
}

export async function signQuestionMarkResult(
  question: QuestionMarkResult,
  expiresIn = DEFAULT_TTL_SEC
): Promise<QuestionMarkResult> {
  const answer_photo_url = question.answer_photo_url
    ? await signAnswerPhotoUrl(question.answer_photo_url, expiresIn)
    : question.answer_photo_url

  const page_photo_urls = question.page_photo_urls
    ? await signAnswerPhotoUrls(question.page_photo_urls, expiresIn)
    : question.page_photo_urls

  const ink_pages = question.ink_pages
    ? await Promise.all(
        question.ink_pages.map(async (page) => ({
          ...page,
          photo_url:
            (await signAnswerPhotoUrl(page.photo_url, expiresIn)) ?? page.photo_url,
        }))
      )
    : question.ink_pages

  return {
    ...question,
    answer_photo_url,
    page_photo_urls,
    ink_pages,
  }
}

export async function signWholePaperResult(
  result: WholePaperResult,
  expiresIn = DEFAULT_TTL_SEC
): Promise<WholePaperResult> {
  const questions = await Promise.all(
    result.questions.map((q) => signQuestionMarkResult(q, expiresIn))
  )

  const pages_ocr = result.pages_ocr
    ? await Promise.all(
        result.pages_ocr.map(async (page) => ({
          ...page,
          photo_url:
            page.photo_url && page.photo_url.length > 0
              ? ((await signAnswerPhotoUrl(page.photo_url, expiresIn)) ??
                page.photo_url)
              : page.photo_url,
        }))
      )
    : result.pages_ocr

  return { ...result, questions, pages_ocr }
}

/** Sign photo fields on API payloads before sending to the browser. */
export async function signMarkPayloadForClient<
  T extends {
    answer_photo_url?: string | null
    page_photo_urls?: string[]
    ink_pages?: Array<{ photo_url: string; line_references?: unknown[] }>
    whole_paper?: WholePaperResult
    partial_questions?: QuestionMarkResult[]
    result?: WholePaperResult | null
    [key: string]: unknown
  },
>(payload: T): Promise<T> {
  const answer_photo_url = payload.answer_photo_url
    ? await signAnswerPhotoUrl(payload.answer_photo_url)
    : payload.answer_photo_url

  const page_photo_urls = payload.page_photo_urls
    ? await signAnswerPhotoUrls(payload.page_photo_urls)
    : payload.page_photo_urls

  const ink_pages = payload.ink_pages
    ? await Promise.all(
        payload.ink_pages.map(async (page) => ({
          ...page,
          photo_url:
            (await signAnswerPhotoUrl(page.photo_url)) ?? page.photo_url,
        }))
      )
    : payload.ink_pages

  const whole_paper = payload.whole_paper
    ? await signWholePaperResult(payload.whole_paper)
    : payload.whole_paper

  const partial_questions = payload.partial_questions
    ? await Promise.all(payload.partial_questions.map(signQuestionMarkResult))
    : payload.partial_questions

  const result = payload.result
    ? await signWholePaperResult(payload.result)
    : payload.result

  return {
    ...payload,
    answer_photo_url,
    page_photo_urls,
    ink_pages,
    whole_paper,
    partial_questions,
    result,
  }
}
