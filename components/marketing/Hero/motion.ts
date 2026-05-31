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
