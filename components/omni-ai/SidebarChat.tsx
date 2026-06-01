'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useOmniAI } from '@/lib/omni-ai/context'
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock'
import { ChatPanel } from './ChatPanel'
import { FloatingActionButton } from './FloatingActionButton'

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

export function SidebarChat() {
  const { isOpen, setIsOpen, context } = useOmniAI()
  const suggestions = CONTEXT_SUGGESTIONS[context.type] || []

  useBodyScrollLock(isOpen)

  return (
    <>
      <FloatingActionButton onClick={() => setIsOpen(!isOpen)} isOpen={isOpen} />

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[35] bg-black/40 backdrop-blur-[2px] md:hidden"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 right-0 top-0 z-40 w-full border-l border-white/10 bg-dark-900 shadow-2xl md:w-[440px]"
            >
              <div className="absolute right-3 top-3 z-10">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5"
                  aria-label="Close sidebar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <ChatPanel
                starterSuggestions={suggestions}
                showSuggestions
                proactiveOpener
                splitPaper
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
