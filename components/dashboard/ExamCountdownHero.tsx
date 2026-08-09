'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  examEncouragement,
  examSessionLabel,
  timeGreeting,
} from '@/lib/dashboard/exam-date'
import { MarkQuestionCta } from './MarkQuestionCta'

type Props = {
  firstName: string
  examDate: string
  daysLeft: number
  weeklyAttempts: number
}

export function ExamCountdownHero({
  firstName,
  examDate,
  daysLeft,
  weeklyAttempts,
}: Props) {
  const [revealed, setRevealed] = useState(false)
  const greeting = timeGreeting(firstName)
  const encouragement = examEncouragement(daysLeft)
  const session = examSessionLabel(examDate)

  return (
    <div className="mb-6">
      <div
        className="ms-dash-countdown-desk"
        onMouseEnter={() => setRevealed(true)}
        onMouseLeave={() => setRevealed(false)}
        onClick={() => setRevealed((v) => !v)}
      >
        <div className="mb-3 flex items-center gap-2">
          <p className="ec-eyebrow mb-0">Countdown</p>
          <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
            DAY
          </span>
        </div>

        <div className="ms-dash-countdown-desk__row">
          <p
            className="ms-dash-countdown-desk__number"
            aria-label={`${daysLeft} days until your ${session}`}
          >
            {daysLeft}
          </p>
          <div className="ms-dash-countdown-desk__copy">
            <p className="ms-dash-countdown-desk__title">
              days until your {session}
            </p>
            <p className="ms-dash-countdown-desk__meta">{encouragement}</p>
            <p className="ms-dash-countdown-desk__meta opacity-90">{greeting}</p>
            <span className="ms-dash-countdown-desk__note" aria-hidden>
              put ink on a script before the calendar wins
            </span>
          </div>
        </div>

        <motion.p
          initial={false}
          animate={{ opacity: revealed ? 1 : 0.55 }}
          className="mt-3 font-mono text-[11px] font-bold uppercase tracking-wide"
        >
          <Link
            href="/account/exam"
            className="text-[var(--ec-text-secondary)] underline-offset-2 hover:text-[var(--ec-brand)] hover:underline"
          >
            Change exam date -&gt;
          </Link>
        </motion.p>
      </div>

      <div className="ms-dash-countdown-desk__actions">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <MarkQuestionCta />
        </motion.div>
        {weeklyAttempts > 0 && (
          <p className="text-caption m-0">
            {weeklyAttempts} question{weeklyAttempts === 1 ? '' : 's'} marked this
            week
          </p>
        )}
      </div>
    </div>
  )
}
