'use client'

import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import { motion } from 'framer-motion'

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

  function handleClick() {
    if (typeof window !== 'undefined') {
      try {
        if (subject && year && season && component) {
          window.localStorage.setItem(
            'examcore_last_selection',
            JSON.stringify({ subject, year, session: season, component })
          )
        }
        if (questionNumber) {
          window.localStorage.setItem(
            'examcore_pending_question',
            questionNumber
          )
        }
      } catch {
        // localStorage may be unavailable; navigation still works without prefill.
      }
    }
    router.push('/mark')
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ y: 0, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      className="ec-btn-primary w-full justify-center text-base sm:w-auto"
      style={{ padding: '16px 28px' }}
    >
      <RotateCcw className="h-4 w-4" />
      Mark this question again
    </motion.button>
  )
}
