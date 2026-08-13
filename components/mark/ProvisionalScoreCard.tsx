'use client'

import { motion } from 'framer-motion'

/**
 * The first-pass mark, shown while the second examiner is still checking it.
 *
 * The wait was never really three minutes long — it was three minutes with
 * nothing in it. The first pass produces a usable score well before the verify
 * pass, the rewrite and the ink overlay are done, and holding it back bought
 * nothing except a longer stare at a progress bar.
 *
 * It is labelled as a first read on purpose. Verification exists precisely
 * because it moves marks, so presenting this as final would be a lie that gets
 * caught roughly whenever it matters most.
 */
export type ProvisionalScoreCardProps = {
  marksEarned: number
  totalMarks: number
}

export function ProvisionalScoreCard({
  marksEarned,
  totalMarks,
}: ProvisionalScoreCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 rounded-lg border border-[var(--ec-border)] bg-[var(--ec-surface)] p-5"
      aria-live="polite"
    >
      <p className="text-xs uppercase tracking-wide text-[var(--ec-text-secondary)]">
        First read
      </p>
      <p className="mt-1 font-serif text-4xl font-semibold leading-none text-[var(--ec-text-primary)]">
        {marksEarned}
        <span className="text-[var(--ec-text-secondary)]">/{totalMarks}</span>
      </p>
      {/* Deliberately does not promise how far it can move. The verify pass
          exists to correct under- and over-marking, and quantifying the swing
          ("a point either way") would be an overclaim we cannot honour. */}
      <p className="mt-3 text-sm text-[var(--ec-text-secondary)]">
        A second examiner is checking this now, so it can still change. The full
        breakdown, with every mark placed on your own writing, arrives with it.
      </p>
    </motion.section>
  )
}
