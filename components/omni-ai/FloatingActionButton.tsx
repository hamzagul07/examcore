'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

interface FABProps {
  onClick: () => void
  isOpen: boolean
}

/** Mobile Ask AI — left side avoids overlapping primary CTAs on /mark. */
export function FloatingActionButton({ onClick, isOpen }: FABProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? 'Close Ask AI' : 'Open Ask AI'}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-4 z-30 flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full ec-fab-brand lg:hidden"
    >
      <Sparkles className="h-5 w-5" aria-hidden />
    </motion.button>
  )
}
