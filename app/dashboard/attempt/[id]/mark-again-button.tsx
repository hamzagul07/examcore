'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ButtonLoadingState } from '@/components/ui/ButtonLoadingState'
import { triggerPrimaryHaptic } from '@/lib/hooks/useTapFeedback'
import { STORAGE_KEYS, writeClientStorage } from '@/lib/client-storage'

type Props = {
  /** Subject code, e.g. "9709" */
  subject?: string
  /** Numeric year, e.g. 2024 */
  year?: number
  /** Season label as stored in the API ("May/June", "October/November", "February/March") */
  season?: string
  /** Component code, e.g. "12" */
  component?: string
  /** Question number, e.g. "2(a)" */
  questionNumber?: string
}

export function MarkAgainButton({
  subject,
  year,
  season,
  component,
  questionNumber,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleClick() {
    if (typeof window !== 'undefined') {
      try {
        if (subject && year && season && component) {
          writeClientStorage(
            STORAGE_KEYS.lastSelection,
            JSON.stringify({ subject, year, session: season, component })
          )
        }
        if (questionNumber) {
          writeClientStorage(STORAGE_KEYS.pendingQuestion, questionNumber)
        }
      } catch {
        // localStorage may be unavailable; navigation still works without prefill.
      }
    }
    triggerPrimaryHaptic()
    startTransition(() => {
      router.push('/mark')
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-busy={pending || undefined}
      data-loading={pending ? 'true' : undefined}
      // Hover lift and press come from the shared button rules (.ec-btn-motion);
      // the framer spring that used to sit on top doubled the movement and
      // pulled the animation library into this route for one button.
      className="ec-btn-primary ec-btn-motion w-full justify-center px-7 py-4 text-base sm:w-auto"
    >
      {pending ? (
        <ButtonLoadingState mode="shimmer" loadingText="Opening…">
          Mark this question again
        </ButtonLoadingState>
      ) : (
        <>
          <span className="font-mono text-[11px] font-bold tracking-wide" aria-hidden>↻</span>
          Mark this question again
        </>
      )}
    </button>
  )
}
