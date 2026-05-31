'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { heroContainer, heroFadeUp, heroFadeUpReduced } from './motion'

interface HeroCopyProps {
  headline: ReactNode
  subhead: ReactNode
  ctas: ReactNode
}

export function HeroCopy({ headline, subhead, ctas }: HeroCopyProps) {
  const prefersReducedMotion = useReducedMotion()
  const childVariants = prefersReducedMotion ? heroFadeUpReduced : heroFadeUp

  return (
    <motion.div variants={heroContainer} initial="hidden" animate="visible">
      {headline}
      <motion.div variants={childVariants}>{subhead}</motion.div>
      <motion.div variants={childVariants}>{ctas}</motion.div>
    </motion.div>
  )
}
