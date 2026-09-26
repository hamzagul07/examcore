import {
  GeminiTimeoutError,
  isGeminiQuotaExhausted,
  isGeminiTimeoutError,
  isTransientOverloadError,
} from '@/lib/marking/gemini-retry'
import { MarkingParseError } from '@/lib/marking/mark-runner'
import { isRequestDeadlineError } from '@/lib/ai/request-deadline'

export type MarkingErrorCode =
  | 'parse_failure'
  | 'overload'
  | 'timeout'
  | 'ocr_empty'
  | 'client'
  | 'unknown'

export type ClassifiedMarkingError = {
  message: string
  retryable: boolean
  code: MarkingErrorCode
  status: number
}

// Substrings that identify a "you need to give us something" error rather than
// a fault on our side. A miss here is not cosmetic: the error is reported as a
// 500 and marked retryable, so the user is told to try again at something that
// will fail identically, and mark_runs records it as an infrastructure failure.
// `find a question in your upload` covers both the combined-script and the
// upload-only paths, which were previously falling through to 'unknown'.
const CLIENT_HINTS = [
  'past paper question',
  'select a subject',
  'Add your question',
  'Add the question',
  'find a question in your upload',
  'total marks for this question',
  'read the total marks',
  // The pre-gate's wording: raised before anything is read, when the student
  // said the marks were in a typed question that has none in it.
  'mark total is not written',
]

/**
 * Failures the UPLOAD decided, as opposed to ones we did: a blank or unreadable
 * photo (`ocr_empty`) and a missing question, subject or total (`client`).
 *
 * The guest's one-a-day slot used to be refunded on every failure, these
 * included. By the time a script is judged unreadable the route has already
 * spent a Flash OCR call per page (up to twenty), a Pro escalation for every
 * page whose read looked illegible — which a blank or noise image triggers by
 * design — and, for a whole paper, the segmentation call. Handing the slot
 * back meant an IP could POST twenty blank JPEGs in a loop forever and
 * ANON_DAILY_MARK_LIMIT bounded nothing on the expensive failure path
 * (code review 2026-09-25, §1.7 reopened). A failure the caller controls
 * keeps the slot; only our own outages give it back.
 */
export function isUploadDecidedFailure(code: MarkingErrorCode): boolean {
  return code === 'client' || code === 'ocr_empty'
}

export function classifyMarkingError(err: unknown): ClassifiedMarkingError {
  const message =
    err instanceof Error
      ? err.message
      : 'Something went wrong while marking. Please try again.'

  if (
    message.includes('No handwriting') ||
    message.includes('handwriting detected')
  ) {
    return {
      message:
        "We couldn't read your handwriting. Try a clearer, flatter photo with good light.",
      retryable: false,
      code: 'ocr_empty',
      status: 400,
    }
  }

  if (CLIENT_HINTS.some((hint) => message.includes(hint))) {
    return {
      message,
      retryable: false,
      code: 'client',
      status: 400,
    }
  }

  if (
    err instanceof MarkingParseError ||
    /could not read the marking result/i.test(message)
  ) {
    return {
      message:
        "We got your answer but couldn't finish marking this time. Tap Try again — you won't need to re-upload.",
      retryable: true,
      code: 'parse_failure',
      status: 500,
    }
  }

  // Budget exhausted before the platform could kill us. Distinct from a single
  // hung call: the model was reachable but kept failing, so a plain "try again"
  // is likely to hit the same wall — say so honestly.
  if (isRequestDeadlineError(err)) {
    return {
      message:
        'Marking is under heavy load and ran out of time. Your upload is still here — try again in a minute.',
      retryable: true,
      code: 'timeout',
      status: 503,
    }
  }

  if (
    isGeminiTimeoutError(err) ||
    err instanceof GeminiTimeoutError ||
    /timed out/i.test(message)
  ) {
    return {
      message: 'Marking took too long — please try again.',
      retryable: true,
      code: 'timeout',
      status: 504,
    }
  }

  if (isGeminiQuotaExhausted(err)) {
    return {
      message:
        'Daily AI marking capacity is full. Try again in a few hours, or email us if this keeps happening.',
      retryable: false,
      code: 'overload',
      status: 503,
    }
  }

  if (isTransientOverloadError(err)) {
    return {
      message:
        'Marking is busy right now — wait a few seconds, then try again.',
      retryable: true,
      code: 'overload',
      status: 503,
    }
  }

  if (
    /failed to fetch|fetch failed|ECONNRESET|ETIMEDOUT|UND_ERR_HEADERS_TIMEOUT|socket hang up|network/i.test(
      message
    )
  ) {
    return {
      message:
        'Connection lost while marking. Try again — your upload is still here.',
      retryable: true,
      code: 'unknown',
      status: 503,
    }
  }

  return {
    message: 'Something went wrong while marking. Please try again.',
    retryable: true,
    code: 'unknown',
    status: 500,
  }
}
