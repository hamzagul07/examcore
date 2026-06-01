'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  examEncouragement,
  examSessionLabel,
  timeGreeting,
} from '@/lib/dashboard/exam-date'
import { CountdownParticles } from './CountdownParticles'

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
  const reduce = useReducedMotion()
  const [revealed, setRevealed] = useState(false)
  const greeting = timeGreeting(firstName)
  const encouragement = examEncouragement(daysLeft)
  const session = examSessionLabel(examDate)

  return (
    <div className="mb-6">
      <div
        className="relative mx-auto max-w-3xl text-center"
        onMouseEnter={() => setRevealed(true)}
        onMouseLeave={() => setRevealed(false)}
        onClick={() => setRevealed((v) => !v)}
      >
        <CountdownParticles />

        <div
          className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${
            reduce ? '' : 'animate-[ec-breathe_10s_ease-in-out_infinite]'
          }`}
          style={{
            width: 'min(420px, 90vw)',
            height: 'min(280px, 70vw)',
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--ec-brand) 18%, transparent) 0%, transparent 70%)',
          }}
          aria-hidden
        />

        <p
          className="relative font-[family-name:var(--font-fraunces)] font-semibold leading-none tracking-tight"
          style={{
            fontSize: 'clamp(4.5rem, 12vw, 9rem)',
            color: 'var(--ec-brand)',
            textShadow:
              '0 0 40px color-mix(in srgb, var(--ec-brand) 35%, transparent)',
          }}
          aria-label={`${daysLeft} days until your ${session}`}
        >
          {daysLeft}
        </p>

        <p className="text-title relative mt-2 text-[var(--ec-text-primary)]">
          days until your {session}
        </p>
        <p className="text-caption relative mt-2">{encouragement}</p>
        <p className="text-caption relative mt-1 opacity-80">{greeting}</p>

        <motion.p
          initial={false}
          animate={{ opacity: revealed ? 1 : 0 }}
          className="text-caption relative mt-3"
        >
          <Link
            href="/account"
            className="text-[var(--ec-text-secondary)] underline-offset-2 hover:text-[var(--ec-brand)] hover:underline"
          >
            Change exam date →
          </Link>
        </motion.p>
      </div>

      <div className="mt-6 flex flex-col items-center">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Link
            href="/mark"
            className="ec-btn-primary inline-flex w-full justify-center sm:w-auto"
          >
            Mark a question
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
        {weeklyAttempts > 0 && (
          <p className="text-caption mt-3 text-center">
            You&apos;ve marked {weeklyAttempts} question
            {weeklyAttempts === 1 ? '' : 's'} this week
          </p>
        )}
      </div>
    </div>
  )
}
