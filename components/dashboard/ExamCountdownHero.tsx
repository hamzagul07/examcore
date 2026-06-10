'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import {
  examEncouragement,
  examSessionLabel,
  timeGreeting,
} from '@/lib/dashboard/exam-date'
import { useIntersectionVisible } from '@/lib/hooks/useIntersectionVisible'
import { CountdownParticles } from './CountdownParticles'
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
  const reduce = useReducedMotion()
  const heroRef = useRef<HTMLDivElement>(null)
  const inView = useIntersectionVisible(heroRef, !reduce)
  const [revealed, setRevealed] = useState(false)
  const greeting = timeGreeting(firstName)
  const encouragement = examEncouragement(daysLeft)
  const session = examSessionLabel(examDate)
  const animateDecor = !reduce && inView

  return (
    <div className="mb-6">
      <div
        ref={heroRef}
        className="relative mx-auto max-w-3xl text-center"
        onMouseEnter={() => setRevealed(true)}
        onMouseLeave={() => setRevealed(false)}
        onClick={() => setRevealed((v) => !v)}
      >
        <CountdownParticles paused={!animateDecor} />

        <div
          className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 will-change-transform ${
            animateDecor ? 'animate-[ec-breathe_10s_ease-in-out_infinite]' : ''
          }`}
          style={{
            width: 'min(420px, 90vw)',
            height: 'min(280px, 70vw)',
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--ec-brand) 7%, transparent) 0%, transparent 70%)',
          }}
          aria-hidden
        />

        <p
          className="ec-countdown-number relative"
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
            href="/account/exam"
            className="text-[var(--ec-text-secondary)] underline-offset-2 hover:text-[var(--ec-brand)] hover:underline"
          >
            Change exam date →
          </Link>
        </motion.p>
      </div>

      <div className="mt-6 flex flex-col items-center">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <MarkQuestionCta />
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
