'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
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

// The motion tokens from premium-craft.css, as framer needs the raw curves:
// --ec-ease-out for fades and the landing sheet, --ec-ease-drawer for the
// side drawer. Durations follow --ec-dur-menu (in) and shorter exits.
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]
const EASE_DRAWER: [number, number, number, number] = [0.32, 0.72, 0, 1]

/**
 * Global Omni-AI shell — opens from nav search (⌘K) or the Ask MarkScheme FAB.
 */
export function OmniAI() {
  const { isOpen, setIsOpen, context } = useOmniAI()
  const reduceMotion = useReducedMotion()
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

  // Backdrops fade in under the panel and leave a touch faster than they came.
  const fadeIn = { duration: reduceMotion ? 0 : 0.2, ease: EASE_OUT }
  const fadeOut = { duration: reduceMotion ? 0 : 0.16, ease: EASE_OUT }

  return (
    <AnimatePresence>
      {isOpen ? (
        isLanding ? (
          <motion.div
            key="landing"
            className="ms-cmdk-overlay"
            onClick={() => setIsOpen(false)}
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: fadeOut }}
            transition={fadeIn}
          >
            <motion.div
              initial={{ y: reduceMotion ? 0 : 16 }}
              animate={{ y: 0 }}
              exit={{
                y: reduceMotion ? 0 : 12,
                transition: { duration: reduceMotion ? 0 : 0.16, ease: EASE_OUT },
              }}
              transition={{ duration: reduceMotion ? 0 : 0.28, ease: EASE_OUT }}
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
          </motion.div>
        ) : (
          <motion.div key="drawer" className="contents">
            <motion.div
              className="fixed inset-0 z-[60] ec-modal-backdrop md:hidden"
              onClick={() => setIsOpen(false)}
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: fadeOut }}
              transition={fadeIn}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{
                x: '100%',
                transition: { duration: reduceMotion ? 0 : 0.2, ease: EASE_DRAWER },
              }}
              transition={{ duration: reduceMotion ? 0 : 0.28, ease: EASE_DRAWER }}
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
