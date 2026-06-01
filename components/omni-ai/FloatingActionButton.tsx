'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

interface FABProps {
  onClick: () => void
  isOpen: boolean
}

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
      className={`fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 z-30 flex min-h-[44px] items-center gap-3 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 py-3 pl-4 pr-5 text-white shadow-[0_8px_32px_rgba(16,185,129,0.4)] transition-shadow hover:shadow-[0_8px_48px_rgba(16,185,129,0.6)] lg:bottom-6 lg:right-6 ${
        isOpen ? 'md:right-[460px]' : ''
      }`}
    >
      <Sparkles className="h-5 w-5" />
      <span className="text-sm font-semibold">Ask AI</span>
    </motion.button>
  )
}
