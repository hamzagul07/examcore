'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import { useOmniAI } from '@/lib/omni-ai/context'
import { ChatPanel } from './ChatPanel'

const LANDING_SUGGESTIONS = [
  'Show me 9709 May/June 2024 Q1',
  'I need help with integration',
  "I'm stressed about exams",
  'How does Examcore work?',
]

export function LandingChat() {
  const { isOpen, setIsOpen, setContext } = useOmniAI()

  useEffect(() => {
    setContext({ type: 'landing' })
  }, [setContext])

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  if (!isOpen) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-2xl"
      >
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex w-full items-center gap-3 rounded-2xl border border-[var(--ec-border)] bg-[var(--ec-surface-raised)]/80 px-6 py-5 backdrop-blur-2xl transition-all ec-hover-brand-border"
        >
          <Sparkles className="h-5 w-5 ec-text-brand transition-transform group-hover:rotate-12" />
          <span className="flex-1 text-left text-[var(--ec-text-secondary)] transition-colors group-hover:text-[var(--ec-text-primary)]">
            Ask Omni-AI anything...
          </span>
          <kbd className="hidden items-center gap-1 rounded border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] px-2 py-1 font-mono text-xs text-[var(--ec-text-secondary)] md:flex">
            <span>⌘</span>
            <span>K</span>
          </kbd>
        </button>
      </motion.div>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-end justify-center p-0 md:items-center md:p-6"
      >
        <div
          className="absolute inset-0 ec-modal-backdrop"
          onClick={() => setIsOpen(false)}
        />

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative h-[85vh] max-h-[800px] w-full overflow-hidden rounded-t-3xl border border-[var(--ec-border)] bg-[var(--ec-surface)] shadow-2xl md:h-[80vh] md:w-[680px] md:rounded-3xl"
        >
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute right-4 top-4 z-10 rounded-lg p-2 text-[var(--ec-text-secondary)] transition-colors hover:bg-[var(--ec-surface-raised)]"
            aria-label="Close chat"
          >
            <X className="h-5 w-5" />
          </button>

          <ChatPanel
            starterSuggestions={LANDING_SUGGESTIONS}
            showSuggestions
            proactiveOpener={false}
            splitPaper
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
