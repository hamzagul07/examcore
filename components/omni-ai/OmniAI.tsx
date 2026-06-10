'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useOmniAI } from '@/lib/omni-ai/context'
import { ChatPanel } from './ChatPanel'

const LANDING_SUGGESTIONS = [
  'Show me 9709 May/June 2024 Q1',
  'I need help with integration',
  "I'm stressed about exams",
  'How does MarkScheme work?',
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
 * Global Omni-AI shell — opens from nav search (⌘K) or the Ask MarkScheme FAB.
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
      {isOpen ? (
        isLanding ? (
          <div
            key="landing"
            className="ms-cmdk-overlay"
            onClick={() => setIsOpen(false)}
            role="presentation"
          >
            <motion.div
              initial={{ y: 16 }}
              animate={{ y: 0 }}
              exit={{ y: 16 }}
              className="ms-omni-panel ms-omni-panel--landing"
              onClick={(e) => e.stopPropagation()}
            >
              <ChatPanel
                starterSuggestions={suggestions}
                showSuggestions
                splitPaper
                showClose
                onClose={() => setIsOpen(false)}
              />
            </motion.div>
          </div>
        ) : (
          <motion.div key="drawer" className="contents">
            <div
              className="fixed inset-0 z-[60] ec-modal-backdrop md:hidden"
              onClick={() => setIsOpen(false)}
              aria-hidden
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 right-0 z-[61] w-full md:w-[440px]"
            >
              <div className="ms-omni-panel ms-omni-panel--drawer h-full">
                <ChatPanel
                  starterSuggestions={suggestions}
                  showSuggestions
                  proactiveOpener
                  splitPaper
                  showClose
                  onClose={() => setIsOpen(false)}
                />
              </div>
            </motion.div>
          </motion.div>
        )
      ) : null}
    </AnimatePresence>
  )
}
