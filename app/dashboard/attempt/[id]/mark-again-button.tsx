'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
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
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-busy={pending || undefined}
      data-loading={pending ? 'true' : undefined}
      whileHover={pending ? undefined : { y: -2, scale: 1.02 }}
      whileTap={pending ? undefined : { y: 0, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      className="ec-btn-primary w-full justify-center px-7 py-4 text-base sm:w-auto"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Opening...
        </>
      ) : (
        <>
          <RotateCcw className="h-4 w-4" />
          Mark this question again
        </>
      )}
    </motion.button>
  )
}
