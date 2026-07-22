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

const CLIENT_HINTS = [
  'past paper question',
  'select a subject',
  'Add your question',
  'Add the question',
]

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
