'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { headlineWord } from './motion'

interface HeroHeadlineProps {
  text: string
  as?: 'h1' | 'h2'
}

const headlineTypography =
  'ec-display text-[clamp(2.25rem,5.4vw,4.5rem)] leading-[1.08] text-[var(--ec-text-primary)]'

function renderHeadlineText(text: string) {
  const emphasis = 'In minutes.'
  if (text.endsWith(emphasis)) {
    const lead = text.slice(0, -emphasis.length).trimEnd()
    return (
      <>
        {lead} <em>{emphasis}</em>
      </>
    )
  }
  return text
}

export function HeroHeadline({ text, as: Tag = 'h1' }: HeroHeadlineProps) {
  const prefersReducedMotion = useReducedMotion()
  const content = renderHeadlineText(text)
  const id = Tag === 'h2' ? 'hero-headline-secondary' : 'hero-headline'
  const MotionTag = Tag === 'h2' ? motion.h2 : motion.h1

  if (prefersReducedMotion) {
    return (
      <MotionTag
        id={id}
        className={headlineTypography}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
      >
        {content}
      </MotionTag>
    )
  }

  const words = text.split(' ')

  return (
    <MotionTag
      id={id}
      aria-label={text}
      initial="hidden"
      animate="visible"
      className={`flex flex-wrap justify-center gap-y-[0.1em] ${headlineTypography}`}
    >
      {words.map((word, i) => {
        const isEmphasis = i >= words.length - 2
        return (
          <motion.span
            key={`${word}-${i}`}
            aria-hidden
            custom={i}
            variants={headlineWord}
            className={`inline-block ${isEmphasis ? 'italic text-[var(--ec-brand)]' : ''}`}
            style={{ marginRight: i === words.length - 1 ? 0 : '0.28em' }}
          >
            {word}
          </motion.span>
        )
      })}
    </MotionTag>
  )
}
