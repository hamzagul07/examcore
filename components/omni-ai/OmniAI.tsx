'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useOmniAI } from '@/lib/omni-ai/context'
import { ChatPanel } from './ChatPanel'

const LANDING_SUGGESTIONS = [
  'Show me 9709 May/June 2024 Q1',
  'I need help with integration',
  "I'm stressed about exams",
  'How does Examcore work?',
]

const CONTEXT_SUGGESTIONS: Record<string, string[]> = {
  dashboard_home: ['What should I work on next?', 'Show me my weakest topic'],
  mastery_matrix: [
    'Explain my weakest topic',
    'Generate a practice question',
    'How do I get to A*?',
  ],
  examiner_ink: [
    'Why did I lose this mark?',
    'Explain step 3',
    'How could I improve?',
  ],
  marking_result: [
    'Why did I lose M1?',
    'What should I fix in my working?',
    'How do I get full marks next time?',
  ],
  marking: ['What does this question test?', 'Tips for this topic'],
  teacher_dashboard: [
    'Draft parent email',
    'Why are students struggling?',
    'Generate practice set',
  ],
}

/**
 * Global Omni-AI shell — opens from SiteHeader "Ask Examcore" or ⌘K.
 */
export function OmniAI() {
  const { isOpen, setIsOpen, context } = useOmniAI()
  const isLanding = context.type === 'landing'
  const suggestions = isLanding
    ? LANDING_SUGGESTIONS
    : CONTEXT_SUGGESTIONS[context.type] || []

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[60] flex ${
            isLanding
              ? 'items-end justify-center p-0 md:items-center md:p-6'
              : 'justify-end'
          }`}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          <motion.div
            initial={
              isLanding
                ? { opacity: 0, y: 40, scale: 0.95 }
                : { x: '100%' }
            }
            animate={isLanding ? { opacity: 1, y: 0, scale: 1 } : { x: 0 }}
            exit={
              isLanding
                ? { opacity: 0, y: 40, scale: 0.95 }
                : { x: '100%' }
            }
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`relative overflow-hidden border shadow-2xl ec-card ${
              isLanding
                ? 'h-[85vh] max-h-[800px] w-full rounded-t-3xl md:h-[80vh] md:w-[680px] md:rounded-3xl'
                : 'h-full w-full md:w-[440px] rounded-none border-l'
            }`}
            style={{ background: 'var(--ec-surface)' }}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 z-10 rounded-lg p-2 transition-colors"
              style={{ color: 'var(--ec-text-secondary)' }}
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>

            <ChatPanel
              starterSuggestions={suggestions}
              showSuggestions
              proactiveOpener={!isLanding}
              splitPaper
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
