'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { headlineWord } from './motion'

interface HeroHeadlineProps {
  text: string
}

const headlineTypography =
  'text-[40px] [font-weight:500] leading-[1.08] tracking-[-0.02em] text-[var(--ec-text-primary)] md:text-[56px] md:leading-[1.06] md:tracking-[-0.022em] lg:text-[72px] lg:leading-[1.05] lg:tracking-[-0.025em]'

export function HeroHeadline({ text }: HeroHeadlineProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return (
      <motion.h1
        id="hero-headline"
        className={headlineTypography}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
      >
        {text}
      </motion.h1>
    )
  }

  const words = text.split(' ')

  return (
    <motion.h1
      id="hero-headline"
      aria-label={text}
      initial="hidden"
      animate="visible"
      className={`flex flex-wrap justify-center gap-y-[0.1em] ${headlineTypography}`}
    >
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          aria-hidden
          custom={i}
          variants={headlineWord}
          className="inline-block"
          style={{ marginRight: i === words.length - 1 ? 0 : '0.28em' }}
        >
          {word}
        </motion.span>
      ))}
    </motion.h1>
  )
}
