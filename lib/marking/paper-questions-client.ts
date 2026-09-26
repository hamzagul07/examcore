'use client'

import { useEffect, useState } from 'react'

/**
 * The question numbers a paper has, for the pickers on /mark.
 *
 * Both the classic desk and the v2 past-paper picker fetched
 * `/api/mark/paper-questions` with their own effect, their own cancellation
 * flag and their own response guard (code review 2026-09-25, §3). One hook.
 *
 * The response is the sorted list `paper-questions.ts` builds server-side.
 */
export async function fetchPaperQuestionOptions(
  paperCode: string,
  paperSession: string,
  signal?: AbortSignal
): Promise<string[]> {
  const res = await fetch(
    `/api/mark/paper-questions?paper_code=${encodeURIComponent(paperCode)}&paper_session=${encodeURIComponent(paperSession)}`,
    { signal }
  )
  const data = (await res.json().catch(() => null)) as { questions?: unknown } | null
  return Array.isArray(data?.questions)
    ? data.questions.filter((q): q is string => typeof q === 'string')
    : []
}

/**
 * Question numbers for `paperCode` + `paperSession`, empty until both are
 * set and while the fetch is in flight. A change of paper cancels the
 * previous request so a slow reply for the old paper cannot land on the new
 * one; a failed fetch leaves the list empty (the field falls back to free
 * text), never stale.
 */
export function usePaperQuestionOptions(paperCode: string, paperSession: string): string[] {
  const [options, setOptions] = useState<string[]>([])

  useEffect(() => {
    if (!paperCode || !paperSession) {
      setOptions([])
      return
    }
    const controller = new AbortController()
    fetchPaperQuestionOptions(paperCode, paperSession, controller.signal)
      .then((questions) => {
        if (!controller.signal.aborted) setOptions(questions)
      })
      .catch(() => {
        if (!controller.signal.aborted) setOptions([])
      })
    return () => controller.abort()
  }, [paperCode, paperSession])

  return options
}
