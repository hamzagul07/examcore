import type { Variants } from 'framer-motion'

export const headlineWord: Variants = {
  hidden: { opacity: 0, filter: 'blur(10px)', y: 40 },
  visible: (i: number) => ({
    opacity: [0, 0.5, 1],
    filter: ['blur(10px)', 'blur(4px)', 'blur(0px)'],
    y: [40, -4, 0],
    transition: {
      duration: 0.7,
      delay: i * 0.1,
      times: [0, 0.5, 1],
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
}

export const heroContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 1.0 },
  },
}

export const heroFadeUp: Variants = {
  hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

export const heroDemoEntrance: Variants = {
  hidden: { opacity: 0, scale: 0.97, filter: 'blur(12px)' },
  visible: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.8, ease: [0.34, 1.56, 0.64, 1] },
  },
}

export const heroFadeUpReduced: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
}

export const heroDemoEntranceReduced: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
}
