/** Map client-side fetch/stream failures to user-facing copy (mirrors server classifyMarkingError). */
export function formatClientMarkError(err: unknown): {
  message: string
  retryable: boolean
} {
  if (err instanceof SyntaxError) {
    return {
      message:
        'Lost connection while marking. Your upload is still here — tap Try again.',
      retryable: true,
    }
  }

  const message =
    err instanceof Error ? err.message : 'Something went wrong while marking.'

  if (
    /failed to fetch|network error|load failed|network request failed|fetch failed/i.test(
      message
    )
  ) {
    return {
      message:
        'Connection lost while marking. Check your network and try again — you won\'t need to re-upload.',
      retryable: true,
    }
  }

  if (/aborted|abort/i.test(message)) {
    return {
      message: 'Marking was interrupted. Try again when you have a stable connection.',
      retryable: true,
    }
  }

  return {
    message: message || 'Something went wrong while marking. Please try again.',
    retryable: true,
  }
}
